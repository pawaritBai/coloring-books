import { handle } from "@/lib/api/responses"
import { deleteSession } from "@/lib/auth/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function POST() {
  return handle(async () => {
    await deleteSession()
    return Response.json({ ok: true })
  })
}
