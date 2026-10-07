import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  getAuthConfig,
  safeEqual,
} from "@/lib/session";

export const runtime = "nodejs";

// Plain HTML form POST from /login, so sign-in works without client JS.
// Both outcomes answer with a 303 so the browser follows with a GET.
export async function POST(req: Request) {
  const auth = getAuthConfig();
  if (!auth) {
    return NextResponse.redirect(new URL("/", req.url), 303);
  }

  let user = "";
  let pass = "";
  try {
    const form = await req.formData();
    user = String(form.get("username") ?? "");
    pass = String(form.get("password") ?? "");
  } catch {
    // Malformed body — falls through as a failed attempt.
  }

  // Compare both, always, so timing doesn't reveal which one was wrong.
  const userOk = safeEqual(user, auth.user);
  const passOk = safeEqual(pass, auth.pass);
  if (!userOk || !passOk) {
    // Small fixed delay to slow down password guessing.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.redirect(new URL("/login?error=1", req.url), 303);
  }

  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set({
    name: SESSION_COOKIE,
    value: createSessionToken(auth),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
