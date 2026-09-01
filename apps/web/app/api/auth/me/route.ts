import { handle, notFound } from "@/lib/api/responses"
import { requireSession } from "@/lib/auth/require"
import { findUserById, toPublicUser } from "@/lib/auth/users-repo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET() {
  return handle(async () => {
    const session = await requireSession()
    const user = await findUserById(session.sub)
    if (!user) return notFound("User not found")
    return Response.json({ user: toPublicUser(user) })
  })
}
