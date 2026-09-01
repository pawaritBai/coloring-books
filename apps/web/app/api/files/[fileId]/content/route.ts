import { Readable } from "node:stream"
import { handle, notFound } from "@/lib/api/responses"
import { findFileById } from "@/lib/db/files-repo"
import { getDriveFileStream } from "@/lib/drive/content"
import { requireSession } from "@/lib/auth/require"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ fileId: string }> }

export function GET(_request: Request, { params }: Ctx) {
  return handle(async () => {
    await requireSession()
    const { fileId } = await params
    const doc = await findFileById(fileId)
    if (!doc) return notFound("File not found")

    const nodeStream = await getDriveFileStream(doc.drive.fileId)
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream

    return new Response(webStream, {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
        "Cache-Control": "private, max-age=300",
        ...(doc.size ? { "Content-Length": String(doc.size) } : {}),
      },
    })
  })
}
