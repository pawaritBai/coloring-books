import { handle, badRequest } from "@/lib/api/responses"
import { parseBookMultipart } from "@/lib/api/multipart"
import { parseBookInput } from "@/lib/api/validation"
import { serializeBook } from "@/lib/api/serialize"
import { ingestFiles } from "@/lib/api/ingest"
import { ensureIndexes } from "@/lib/db/collections"
import {
  createBookDoc,
  deleteBookDoc,
  getBookDoc,
  listBooks,
  recomputeBook,
} from "@/lib/db/books-repo"
import { filesForBook } from "@/lib/db/files-repo"
import { ensureCategories } from "@/lib/db/categories-repo"
import { files as filesCol } from "@/lib/db/collections"
import type { FileDoc } from "@/lib/db/collections"
import type { StatusFilter } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: Request) {
  return handle(async () => {
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
    await ensureIndexes()
    const mp = await parseBookMultipart(request)

    const parsed = parseBookInput(mp.fields)
    if (!parsed.ok) return badRequest(parsed.error)

    if (mp.badSlots.length > 0) {
      return badRequest(`Unknown upload slot: ${mp.badSlots.join(", ")}`)
    }
    if (mp.files.length === 0) {
      return badRequest("Upload at least one file into any slot.")
    }

    const categories = await ensureCategories(parsed.value.categories)
    const book = await createBookDoc({ ...parsed.value, categories })

    try {
      await ingestFiles(book.bookId, mp.files)
    } catch (err) {
      // creation failed mid-upload — remove the empty book so we don't leave junk
      await deleteBookDoc(book.bookId).catch(() => {})
      throw err
    }

    await recomputeBook(book.bookId)
    const fresh = await getBookDoc(book.bookId)
    const bookFiles = await filesForBook(book.bookId)
    return Response.json(
      { book: serializeBook(fresh ?? book, bookFiles) },
      { status: 201 },
    )
  })
}
