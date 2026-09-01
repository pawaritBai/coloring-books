import { compare } from "bcryptjs"
import { z } from "zod"
import { handle, badRequest } from "@/lib/api/responses"
import { ensureIndexes } from "@/lib/db/collections"
import { createSession } from "@/lib/auth/session"
import { findUserByLogin, toPublicUser } from "@/lib/auth/users-repo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
})

export function POST(request: Request) {
  return handle(async () => {
    await ensureIndexes()
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return badRequest("Login and password are required.")

    const user = await findUserByLogin(parsed.data.login)
    const ok = user
      ? await compare(parsed.data.password, user.passwordHash)
      : false

    if (!user || !ok) {
      return Response.json(
        { error: "Invalid login or password" },
        { status: 401 },
      )
    }

    await createSession({ id: String(user._id), username: user.username })
    return Response.json({ user: toPublicUser(user) })
  })
}
