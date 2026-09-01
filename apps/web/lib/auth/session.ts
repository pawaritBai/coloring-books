import { cookies } from "next/headers"
import {
  decrypt,
  encrypt,
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  type SessionPayload,
} from "@/lib/auth/jwt"

export type { SessionPayload }
export { SESSION_COOKIE }

export async function createSession(user: {
  id: string
  username: string
}): Promise<void> {
  const token = await encrypt({ sub: user.id, username: user.username })
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  })
}

export async function deleteSession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  return decrypt(store.get(SESSION_COOKIE)?.value)
}
