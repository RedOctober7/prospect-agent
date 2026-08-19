import { describe, it, expect } from "vitest";
import { PAGE_SIZE, encodeCursor, decodeCursor, paginate, ProspectPatchSchema } from "./prospects";

function row(id: string, minutesAgo: number) {
  return { id, createdAt: new Date(Date.UTC(2026, 0, 1, 0, minutesAgo, 0)) };
}

describe("encodeCursor / decodeCursor", () => {
  it("round-trips id and createdAt", () => {
    const item = row("abc123", 5);
    const decoded = decodeCursor(encodeCursor(item));
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe("abc123");
    expect(decoded?.createdAt.getTime()).toBe(item.createdAt.getTime());
  });

  it("returns null for garbage input", () => {
    expect(decodeCursor("not-a-real-cursor")).toBeNull();
    expect(decodeCursor("")).toBeNull();
  });

  it("returns null when the decoded payload has no separator", () => {
    const noSeparator = Buffer.from("nothingtosplit", "utf-8").toString("base64url");
    expect(decodeCursor(noSeparator)).toBeNull();
  });

  it("returns null when the timestamp half doesn't parse as a date", () => {
    const badDate = Buffer.from("not-a-date_someid", "utf-8").toString("base64url");
    expect(decodeCursor(badDate)).toBeNull();
  });
});

describe("paginate", () => {
  it("reports hasMore=false and no cursor when under a full page", () => {
    const items = [row("a", 0), row("b", 1)];
    const result = paginate(items);
    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("handles an empty list", () => {
    const result = paginate([]);
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("truncates to PAGE_SIZE and returns a cursor anchored on the last kept row when there's an extra row", () => {
    const items = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => row(`id-${i}`, i));
    const result = paginate(items);
    expect(result.items).toHaveLength(PAGE_SIZE);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(encodeCursor(items[PAGE_SIZE - 1]));
    // The lookahead row must never leak into the returned page.
    expect(result.items.some((r) => r.id === `id-${PAGE_SIZE}`)).toBe(false);
  });

  it("the cursor stays valid even if the anchor row is later deleted from the DB", () => {
    // paginate() only needs the row's *value* (createdAt/id) at the moment
    // it computes the cursor — nothing here depends on the row continuing
    // to exist afterwards, unlike Prisma's `cursor: { id }` pagination.
    const items = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => row(`id-${i}`, i));
    const { nextCursor } = paginate(items);
    expect(nextCursor).not.toBeNull();
    const decoded = decodeCursor(nextCursor!);
    expect(decoded?.id).toBe(`id-${PAGE_SIZE - 1}`);
  });
});

describe("ProspectPatchSchema", () => {
  it("accepts a single-field status update", () => {
    const result = ProspectPatchSchema.safeParse({ status: "contacted" });
    expect(result.success).toBe(true);
  });

  it("accepts a full field update", () => {
    const result = ProspectPatchSchema.safeParse({
      companyName: "Acme",
      website: "acme.com",
      signal: "raised a round",
      signalSource: "https://example.com/news",
      targetRole: "VP Sales",
      opener: "Saw the round.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty body", () => {
    const result = ProspectPatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a blank/whitespace-only opener", () => {
    const result = ProspectPatchSchema.safeParse({ opener: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status value", () => {
    const result = ProspectPatchSchema.safeParse({ status: "bogus" });
    expect(result.success).toBe(false);
  });

  it("allows clearing website/signalSource with an empty string", () => {
    const result = ProspectPatchSchema.safeParse({ website: "", signalSource: "" });
    expect(result.success).toBe(true);
  });
});
