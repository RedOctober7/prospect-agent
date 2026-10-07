import { describe, it, expect } from "vitest";
import { groupRepeatedSearches } from "./searchTrace";

describe("groupRepeatedSearches", () => {
  it("collapses back-to-back repeats of the same query", () => {
    expect(
      groupRepeatedSearches([
        { query: "acme funding 2026", results: 10, viaCode: true },
        { query: "acme funding 2026", results: 9, viaCode: true },
        { query: "acme hires 2026", results: 8, viaCode: true },
      ])
    ).toEqual([
      { query: "acme funding 2026", results: 10, viaCode: true, count: 2 },
      { query: "acme hires 2026", results: 8, viaCode: true, count: 1 },
    ]);
  });

  it("keeps repeats apart when one failed and the other didn't", () => {
    const grouped = groupRepeatedSearches([
      { query: "acme news", error: "too_many_requests" },
      { query: "acme news", results: 5 },
    ]);
    expect(grouped.map((g) => g.count)).toEqual([1, 1]);
  });

  it("doesn't merge the same query when it isn't consecutive", () => {
    const grouped = groupRepeatedSearches([
      { query: "a", results: 1 },
      { query: "b", results: 1 },
      { query: "a", results: 1 },
    ]);
    expect(grouped.map((g) => g.query)).toEqual(["a", "b", "a"]);
  });
});
