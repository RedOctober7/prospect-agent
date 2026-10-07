import { createHmac, timingSafeEqual } from "crypto";

// Login gate for the whole app. Enabled only when both env vars are set, so
// local dev works without extra setup — set APP_BASIC_AUTH_USER /
// APP_BASIC_AUTH_PASSWORD before any real deploy so a shared/scraped URL
// can't burn the Anthropic API budget.

export const SESSION_COOKIE = "pa_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AuthConfig = { user: string; pass: string };

export function getAuthConfig(): AuthConfig | null {
  const user = process.env.APP_BASIC_AUTH_USER;
  const pass = process.env.APP_BASIC_AUTH_PASSWORD;
  return user && pass ? { user, pass } : null;
}

// Constant-time string compare. timingSafeEqual throws on mismatched lengths,
// so return early on those instead of leaking where the strings differ.
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// The signing key is derived from the credentials themselves, so changing
// either env var invalidates every existing session.
function sessionKey(auth: AuthConfig): string {
  return `${auth.user}\u0000${auth.pass}`;
}

function sign(payload: string, auth: AuthConfig): string {
  return createHmac("sha256", sessionKey(auth)).update(payload).digest("base64url");
}

// Token format: "v1.<expiry unix seconds>.<hmac>". Stateless — nothing to
// store server-side, which suits a single-user tool on serverless.
export function createSessionToken(auth: AuthConfig, now: number = Date.now()): string {
  const exp = Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `v1.${exp}`;
  return `${payload}.${sign(payload, auth)}`;
}

export function verifySessionToken(
  token: string | undefined,
  auth: AuthConfig,
  now: number = Date.now()
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const exp = Number(parts[1]);
  if (!Number.isInteger(exp) || exp * 1000 <= now) return false;
  return safeEqual(parts[2], sign(`${parts[0]}.${parts[1]}`, auth));
}
