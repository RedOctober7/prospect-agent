export type SearchTrace = {
  query: string;
  // How many results came back, or the tool's error code instead. A failed
  // search is a normal 200 with an error object in place of the results, so
  // without this a failure looks like a search that just found nothing.
  results?: number;
  error?: string;
  // web_search_20260209 can run searches from inside its own code execution
  // (dynamic filtering), not only as a direct model call.
  viaCode?: boolean;
};

// web_search_20260209 can run the same query twice back to back (see
// MAX_SEARCHES in lib/research.ts). Collapse consecutive repeats into one
// entry with a count so the trace reads as what was actually searched.
// Kept apart from lib/research.ts so the client UI can import it without
// pulling in the Anthropic SDK.
export type GroupedSearch = SearchTrace & { count: number };

export function groupRepeatedSearches(searches: SearchTrace[]): GroupedSearch[] {
  const groups: GroupedSearch[] = [];
  for (const s of searches) {
    const last = groups[groups.length - 1];
    if (last && last.query === s.query && last.error === s.error && last.viaCode === s.viaCode) {
      last.count += 1;
    } else {
      groups.push({ ...s, count: 1 });
    }
  }
  return groups;
}
