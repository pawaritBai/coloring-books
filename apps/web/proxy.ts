import { NextResponse, type NextRequest } from "next/server"
import { decrypt, SESSION_COOKIE } from "@/lib/auth/jwt"

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

const AUTH_API_PREFIX = "/api/auth/"

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Auth endpoints (login / logout / me) are always reachable.
  if (pathname.startsWith(AUTH_API_PREFIX)) return NextResponse.next()

  const session = await decrypt(req.cookies.get(SESSION_COOKIE)?.value)
  const isApi = pathname.startsWith("/api/")

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 })
    }
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
