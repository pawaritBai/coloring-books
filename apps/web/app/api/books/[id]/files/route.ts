import { handle, badRequest, notFound } from "@/lib/api/responses"
import { parseBookMultipart } from "@/lib/api/multipart"
import { serializeBook } from "@/lib/api/serialize"
import { ingestFiles } from "@/lib/api/ingest"
import { ensureIndexes } from "@/lib/db/collections"
import { getBookDoc, recomputeBook } from "@/lib/db/books-repo"
import { filesForBook } from "@/lib/db/files-repo"
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

    const mp = await parseBookMultipart(request)
    if (mp.badSlots.length > 0) {
      return badRequest(`Unknown upload slot: ${mp.badSlots.join(", ")}`)
    }
    if (mp.files.length === 0) {
      return badRequest("No files to upload.")
    }

    await ingestFiles(id, mp.files)
    await recomputeBook(id)

    const fresh = await getBookDoc(id)
    return Response.json({
      book: serializeBook(fresh ?? doc, await filesForBook(id)),
    })
  })
}
