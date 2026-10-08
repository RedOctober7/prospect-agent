import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getAuthConfig, verifySessionToken } from "@/lib/session";

// Next.js 16 renamed middleware.ts -> proxy.ts (exported fn: proxy, not
// middleware). Runs on the Node.js runtime, so `crypto` is available.

// Exact matches. The keep-alive is called by Vercel Cron, which has no
// session; the route checks CRON_SECRET itself (see lib/cron.ts).
const PUBLIC_PATHS = new Set(["/login", "/api/login", "/api/cron/keepalive"]);

// Gates the whole app (UI + API routes) behind the login page when
// APP_BASIC_AUTH_USER / APP_BASIC_AUTH_PASSWORD are set; see lib/session.ts.
export function proxy(req: NextRequest) {
  const auth = getAuthConfig();
  if (!auth) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  const signedIn = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, auth);

  if (PUBLIC_PATHS.has(pathname)) {
    // Already signed in? Skip the login page.
    if (signedIn && pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (signedIn) {
    return NextResponse.next();
  }

  // API callers get a status they can handle; pages get the login screen.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
