import { handle, badRequest, notFound } from "@/lib/api/responses"
import { deleteBodySchema } from "@/lib/api/validation"
import { serializeBook } from "@/lib/api/serialize"
import { ensureIndexes } from "@/lib/db/collections"
import { getBookDoc, recomputeBook } from "@/lib/db/books-repo"
import {
  deleteFilesByIds,
  deleteSection,
  deleteSlot,
  filesForBook,
} from "@/lib/db/files-repo"
import { deleteDriveFiles } from "@/lib/drive/drive-service"
import type { FileDoc } from "@/lib/db/collections"
import { requireSession } from "@/lib/auth/require"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export function POST(request: Request, { params }: Ctx) {
  return handle(async () => {
    await requireSession()
    await ensureIndexes()
    const { id } = await params
    const doc = await getBookDoc(id)
    if (!doc) return notFound("Book not found")

    const body = await request.json().catch(() => null)
    const parsed = deleteBodySchema.safeParse(body)
    if (!parsed.success) return badRequest("Invalid delete request.")

    let removed: FileDoc[] = []
    if ("fileIds" in parsed.data) {
      removed = await deleteFilesByIds(id, parsed.data.fileIds)
    } else if ("folder" in parsed.data) {
      removed = await deleteSlot(id, parsed.data.section, parsed.data.folder)
    } else {
      removed = await deleteSection(id, parsed.data.section)
    }

    await deleteDriveFiles(removed.map((f) => f.drive.fileId))
    const fresh = await recomputeBook(id)
    return Response.json({
      book: serializeBook(fresh ?? doc, await filesForBook(id)),
      deleted: removed.length,
    })
  })
}
