import { describe, it, expect } from "vitest";
import { SESSION_MAX_AGE_SECONDS, createSessionToken, safeEqual, verifySessionToken } from "./session";

const auth = { user: "rep", pass: "correct horse battery staple" };
const now = Date.UTC(2026, 9, 7);

describe("session tokens", () => {
  it("verifies a token it just created", () => {
    expect(verifySessionToken(createSessionToken(auth, now), auth, now)).toBe(true);
  });

  it("rejects an expired token", () => {
    const token = createSessionToken(auth, now);
    const later = now + (SESSION_MAX_AGE_SECONDS + 1) * 1000;
    expect(verifySessionToken(token, auth, later)).toBe(false);
  });

  it("rejects a token after the password changes", () => {
    const token = createSessionToken(auth, now);
    expect(verifySessionToken(token, { ...auth, pass: "new password" }, now)).toBe(false);
  });

  it("rejects a token with an edited expiry", () => {
    const [v, exp, sig] = createSessionToken(auth, now).split(".");
    const forged = `${v}.${Number(exp) + 999999}.${sig}`;
    expect(verifySessionToken(forged, auth, now)).toBe(false);
  });

  it("rejects missing and malformed tokens", () => {
    expect(verifySessionToken(undefined, auth, now)).toBe(false);
    expect(verifySessionToken("", auth, now)).toBe(false);
    expect(verifySessionToken("v1.notanumber.sig", auth, now)).toBe(false);
    expect(verifySessionToken("garbage", auth, now)).toBe(false);
  });
});

describe("safeEqual", () => {
  it("compares strings, including different lengths", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
