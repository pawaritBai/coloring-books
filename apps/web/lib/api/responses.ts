import { HttpError } from "@/lib/auth/require"

export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init)
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 })
}

export function notFound(message = "Not found"): Response {
  return Response.json({ error: message }, { status: 404 })
}

export function serverError(message = "Internal error"): Response {
  return Response.json({ error: message }, { status: 500 })
}

/** Wrap a route body so thrown errors become clean JSON. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status })
    }
    console.error("[api]", err)
    const message = err instanceof Error ? err.message : "Internal error"
    return serverError(message)
  }
}
