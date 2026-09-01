import { NextResponse, type NextRequest } from "next/server"
import { decrypt, SESSION_COOKIE } from "@/lib/auth/jwt"

// Runs on page routes only. `/api/*` is deliberately excluded so Next.js does
// not buffer request bodies for uploads — every API route enforces auth itself
// via `requireSession()`.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = await decrypt(req.cookies.get(SESSION_COOKIE)?.value)

  if (!session) {
    if (pathname !== "/login") {
      const url = req.nextUrl.clone()
      url.pathname = "/login"
      url.search = `next=${encodeURIComponent(pathname)}`
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Signed in: keep them off the login page.
  if (pathname === "/login") {
    const url = req.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
