import { describe, it, expect } from "vitest";
import { isHttpUrl } from "./url";

describe("isHttpUrl", () => {
  it("accepts https and http URLs", () => {
    expect(isHttpUrl("https://techcrunch.com/2026/01/acme-raises-seed")).toBe(true);
    expect(isHttpUrl("http://example.com/press-release")).toBe(true);
  });

  it("rejects javascript: and data: URLs", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects non-http schemes", () => {
    expect(isHttpUrl("ftp://example.com/file")).toBe(false);
    expect(isHttpUrl("mailto:someone@example.com")).toBe(false);
  });

  it("rejects empty strings and plain text", () => {
    expect(isHttpUrl("")).toBe(false);
    expect(isHttpUrl("not a url at all")).toBe(false);
  });
});
