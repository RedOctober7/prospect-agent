import { describe, it, expect } from "vitest";
import { parseCompanyLines } from "./parseLines";

describe("parseCompanyLines", () => {
  it("splits company and website on the first comma", () => {
    const { entries } = parseCompanyLines("HubSpot,hubspot.com", "batch");
    expect(entries).toHaveLength(1);
    expect(entries[0].company).toBe("HubSpot");
    expect(entries[0].website).toBe("hubspot.com");
  });

  it("allows a company with no website", () => {
    const { entries } = parseCompanyLines("HubSpot", "batch");
    expect(entries[0].company).toBe("HubSpot");
    expect(entries[0].website).toBe("");
  });

  it("trims whitespace around company and website", () => {
    const { entries } = parseCompanyLines("  HubSpot ,  hubspot.com  ", "batch");
    expect(entries[0].company).toBe("HubSpot");
    expect(entries[0].website).toBe("hubspot.com");
  });

  it("ignores blank lines", () => {
    const { entries } = parseCompanyLines("HubSpot,hubspot.com\n\n\nSalesforce,salesforce.com", "batch");
    expect(entries).toHaveLength(2);
  });

  it("dedupes company names case-insensitively, keeping the first occurrence", () => {
    const { entries, skipped } = parseCompanyLines(
      "HubSpot,hubspot.com\nSalesforce,salesforce.com\nhubspot,other.com\nHUBSPOT,x.com\nOutreach,outreach.io",
      "batch"
    );
    expect(entries.map((e) => e.company)).toEqual(["HubSpot", "Salesforce", "Outreach"]);
    expect(entries.find((e) => e.company === "HubSpot")?.website).toBe("hubspot.com");
    expect(skipped).toBe(2);
  });

  it("reports zero skipped when there are no duplicates", () => {
    const { skipped } = parseCompanyLines("HubSpot,hubspot.com\nSalesforce,salesforce.com", "batch");
    expect(skipped).toBe(0);
  });

  it("returns an empty result for blank input", () => {
    const { entries, skipped } = parseCompanyLines("   \n  \n", "batch");
    expect(entries).toEqual([]);
    expect(skipped).toBe(0);
  });

  it("gives every entry a unique id prefixed as requested", () => {
    const { entries } = parseCompanyLines("HubSpot,hubspot.com\nSalesforce,salesforce.com", "signal");
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    for (const e of entries) {
      expect(e.id.startsWith("signal-")).toBe(true);
      expect(e.status).toBe("pending");
    }
  });
});
