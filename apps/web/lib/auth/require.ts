import { getSession, type SessionPayload } from "@/lib/auth/session"

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "HttpError"
    this.status = status
  }
}

/** Throws HttpError(401) when there is no valid session. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) throw new HttpError(401, "Not signed in")
  return session
}
