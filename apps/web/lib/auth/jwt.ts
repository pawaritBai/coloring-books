import { SignJWT, jwtVerify } from "jose"

export const SESSION_COOKIE = "bookshelf_session"
export const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60

export interface SessionPayload {
  sub: string
  username: string
}

function key(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Add it to apps/web/.env.local (e.g. `openssl rand -base64 32`).",
    )
  }
  return new TextEncoder().encode(secret)
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .sign(key())
}

export async function decrypt(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] })
    if (typeof payload.sub === "string" && typeof payload.username === "string") {
      return { sub: payload.sub, username: payload.username }
    }
    return null
  } catch {
    return null
  }
}
