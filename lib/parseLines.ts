export type ParsedCompanyEntry = {
  id: string;
  status: "pending";
  company: string;
  website: string;
};

// Shared by batch and signal mode: one "Company,website.com" per line,
// case-insensitive dedup within the paste so a repeated line doesn't fire
// two API calls for the same company.
export function parseCompanyLines(
  text: string,
  idPrefix: string
): { entries: ParsedCompanyEntry[]; skipped: number } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const seen = new Set<string>();
  const entries: ParsedCompanyEntry[] = [];
  let skipped = 0;

  lines.forEach((line, i) => {
    const commaIdx = line.indexOf(",");
    const company = commaIdx >= 0 ? line.slice(0, commaIdx).trim() : line.trim();
    const website = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : "";
    const key = company.toLowerCase();
    if (seen.has(key)) {
      skipped++;
      return;
    }
    seen.add(key);
    entries.push({ id: `${idPrefix}-${Date.now()}-${i}`, status: "pending", company, website });
  });

  return { entries, skipped };
}
