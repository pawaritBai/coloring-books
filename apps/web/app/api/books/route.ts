import { handle, badRequest } from "@/lib/api/responses"
import { parseBookMultipart } from "@/lib/api/multipart"
import { parseBookInput } from "@/lib/api/validation"
import { serializeBook } from "@/lib/api/serialize"
import { ingestFiles } from "@/lib/api/ingest"
import { ensureIndexes, nextBookId } from "@/lib/db/collections"
import {
  createBookDoc,
  deleteBookDoc,
  listBooks,
  recomputeBook,
} from "@/lib/db/books-repo"
import { ensureCategories } from "@/lib/db/categories-repo"
import { files as filesCol } from "@/lib/db/collections"
import type { FileDoc } from "@/lib/db/collections"
import type { StatusFilter } from "@/lib/types"
import { requireSession } from "@/lib/auth/require"
import { deleteDriveFile, ensureBookFolders } from "@/lib/drive/drive-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: Request) {
  return handle(async () => {
    await requireSession()
    await ensureIndexes()
    const url = new URL(request.url)
    const bookDocs = await listBooks({
      q: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      status: (url.searchParams.get("status") as StatusFilter) ?? undefined,
    })

    const ids = bookDocs.map((b) => b.bookId)
    const col = await filesCol()
    const allFiles = ids.length
      ? await col.find({ bookId: { $in: ids } }).toArray()
      : []
    const byBook = new Map<string, FileDoc[]>()
    for (const f of allFiles) {
      const list = byBook.get(f.bookId) ?? []
      list.push(f)
      byBook.set(f.bookId, list)
    }

    return Response.json({
      books: bookDocs.map((b) => serializeBook(b, byBook.get(b.bookId) ?? [])),
    })
  })
}

export function POST(request: Request) {
  return handle(async () => {
    await requireSession()
    await ensureIndexes()

    // Reserve the id up front so the Drive folder tree can be built in parallel
    // with reading the (potentially large) multipart body.
    const bookId = await nextBookId()
    const [mp, drive] = await Promise.all([
      parseBookMultipart(request),
      ensureBookFolders(bookId),
    ])

    const cleanupFolders = () =>
      deleteDriveFile(drive.rootFolderId).catch(() => {})

    const parsed = parseBookInput(mp.fields)
    if (!parsed.ok) {
      await cleanupFolders()
      return badRequest(parsed.error)
    }
    if (mp.badSlots.length > 0) {
      await cleanupFolders()
      return badRequest(`Unknown upload slot: ${mp.badSlots.join(", ")}`)
    }
    if (mp.files.length === 0) {
      await cleanupFolders()
      return badRequest("Upload at least one file into any slot.")
    }

    const categories = await ensureCategories(parsed.value.categories)
    const book = await createBookDoc(
      { ...parsed.value, categories },
      { bookId, drive },
    )

    let bookFiles
    try {
      bookFiles = await ingestFiles(book, mp.files)
    } catch (err) {
      // failed mid-upload — remove the book + its Drive folder so nothing lingers
      await Promise.all([
        deleteBookDoc(book.bookId).catch(() => {}),
        cleanupFolders(),
      ])
      throw err
    }

    const fresh = await recomputeBook(book.bookId)
    return Response.json(
      { book: serializeBook(fresh ?? book, bookFiles) },
      { status: 201 },
    )
  })
}
