import { NextResponse, type NextRequest } from "next/server"
import { decrypt, SESSION_COOKIE } from "@/lib/auth/jwt"

// Runs on page routes only. `/api/*` is deliberately excluded so Next.js does
// not buffer request bodies for uploads — every API route enforces auth itself
// via `requireSession()`.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

/**
 * Build a redirect URL that respects the proxy in front of us (Cloudflare
 * Tunnel, a load balancer, …) so we don't bounce the browser to an internal
 * `http://web:3000` address.
 */
function redirectUrl(req: NextRequest, pathname: string, search = ""): URL {
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    req.nextUrl.protocol.replace(":", "")
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host
  return new URL(`${proto}://${host}${pathname}${search ? `?${search}` : ""}`)
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = await decrypt(req.cookies.get(SESSION_COOKIE)?.value)

  if (!session) {
    if (pathname !== "/login") {
      return NextResponse.redirect(
        redirectUrl(req, "/login", `next=${encodeURIComponent(pathname)}`),
      )
    }
    return NextResponse.next()
  }

  // Signed in: keep them off the login page.
  if (pathname === "/login") {
    return NextResponse.redirect(redirectUrl(req, "/"))
  }

  return NextResponse.next()
}
