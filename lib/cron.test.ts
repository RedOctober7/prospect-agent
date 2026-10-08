import { describe, it, expect } from "vitest";
import { isAuthorizedCron } from "./cron";

const secret = "s3cret-value-for-tests";

describe("isAuthorizedCron", () => {
  it("accepts the Bearer header Vercel Cron sends", () => {
    expect(isAuthorizedCron(`Bearer ${secret}`, secret)).toBe(true);
  });

  it("rejects a wrong or missing header", () => {
    expect(isAuthorizedCron("Bearer nope", secret)).toBe(false);
    expect(isAuthorizedCron(secret, secret)).toBe(false);
    expect(isAuthorizedCron(null, secret)).toBe(false);
  });

  it("rejects everything when CRON_SECRET is unset or empty", () => {
    expect(isAuthorizedCron("Bearer undefined", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
    expect(isAuthorizedCron(null, undefined)).toBe(false);
  });
});
