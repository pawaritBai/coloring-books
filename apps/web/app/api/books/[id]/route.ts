import { handle, badRequest, notFound } from "@/lib/api/responses"
import { parseBookInput } from "@/lib/api/validation"
import { serializeBook } from "@/lib/api/serialize"
import { ensureIndexes } from "@/lib/db/collections"
import {
  deleteBookDoc,
  getBookDoc,
  updateBookDoc,
} from "@/lib/db/books-repo"
import { deleteAllForBook, filesForBook } from "@/lib/db/files-repo"
import { ensureCategories } from "@/lib/db/categories-repo"
import { deleteDriveFile, deleteDriveFiles } from "@/lib/drive/drive-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export function GET(_request: Request, { params }: Ctx) {
  return handle(async () => {
    await ensureIndexes()
    const { id } = await params
    const doc = await getBookDoc(id)
    if (!doc) return notFound("Book not found")
    return Response.json({ book: serializeBook(doc, await filesForBook(id)) })
  })
}

export function PATCH(request: Request, { params }: Ctx) {
  return handle(async () => {
    await ensureIndexes()
    const { id } = await params
    const body = await request.json().catch(() => null)
    const parsed = parseBookInput(body ?? {})
    if (!parsed.ok) return badRequest(parsed.error)

    const categories = await ensureCategories(parsed.value.categories)
    const updated = await updateBookDoc(id, { ...parsed.value, categories })
    if (!updated) return notFound("Book not found")
    return Response.json({ book: serializeBook(updated, await filesForBook(id)) })
  })
}

export function DELETE(_request: Request, { params }: Ctx) {
  return handle(async () => {
    await ensureIndexes()
    const { id } = await params
    const doc = await getBookDoc(id)
    if (!doc) return notFound("Book not found")

    const removed = await deleteAllForBook(id)
    await deleteDriveFiles(removed.map((f) => f.drive.fileId))
    if (doc.drive.rootFolderId) {
      // deleting the book's folder also clears its (now empty) subfolders
      await deleteDriveFile(doc.drive.rootFolderId).catch(() => {})
    }
    await deleteBookDoc(id)
    return Response.json({ ok: true })
  })
}
