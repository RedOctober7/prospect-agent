import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

// Next.js 16 renamed middleware.ts -> proxy.ts (exported fn: proxy, not
// middleware). Runs on the Node.js runtime, so `crypto` is available.

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on mismatched lengths, so pad instead of
  // short-circuiting on a public length check.
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// Gates the whole app (UI + API routes) behind HTTP Basic Auth so a
// scraped/shared URL can't burn the Anthropic API budget. Only enforced
// when both env vars are set, so local dev works without extra setup —
// set APP_BASIC_AUTH_USER / APP_BASIC_AUTH_PASSWORD before any real deploy.
export function proxy(req: NextRequest) {
  const user = process.env.APP_BASIC_AUTH_USER;
  const pass = process.env.APP_BASIC_AUTH_PASSWORD;

  if (!user || !pass) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const sepIdx = decoded.indexOf(":");
    const suppliedUser = sepIdx >= 0 ? decoded.slice(0, sepIdx) : decoded;
    const suppliedPass = sepIdx >= 0 ? decoded.slice(sepIdx + 1) : "";
    if (safeEqual(suppliedUser, user) && safeEqual(suppliedPass, pass)) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Prospect Agent"' },
  });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
