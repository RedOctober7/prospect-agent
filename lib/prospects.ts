// Shared between the SSR page load and the "load more" API route so both
// paginate the same way.
export const PAGE_SIZE = 25;

export const prospectListSelect = {
  id: true,
  companyName: true,
  website: true,
  signal: true,
  signalSource: true,
  targetRole: true,
  opener: true,
  status: true,
  createdAt: true,
} as const;

type CursorItem = { id: string; createdAt: Date };

// Encodes (createdAt, id) rather than Prisma's `cursor: { id }` pagination,
// which requires the anchor row to still exist — deleting the last row on a
// page would otherwise make findMany silently return an empty page even
// though older rows are still there. Filtering by "everything before this
// timestamp (tie-broken by id)" doesn't care whether that row still exists.
export function encodeCursor(item: CursorItem): string {
  return Buffer.from(`${item.createdAt.toISOString()}_${item.id}`, "utf-8").toString("base64url");
}

export function decodeCursor(token: string): CursorItem | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const sepIdx = raw.indexOf("_");
    if (sepIdx === -1) return null;
    const createdAt = new Date(raw.slice(0, sepIdx));
    const id = raw.slice(sepIdx + 1);
    if (!id || Number.isNaN(createdAt.getTime())) return null;
    return { id, createdAt };
  } catch {
    return null;
  }
}

export function paginate<T extends CursorItem>(
  itemsPlusOne: T[]
): { items: T[]; hasMore: boolean; nextCursor: string | null } {
  const hasMore = itemsPlusOne.length > PAGE_SIZE;
  const items = hasMore ? itemsPlusOne.slice(0, PAGE_SIZE) : itemsPlusOne;
  const last = items[items.length - 1];
  return { items, hasMore, nextCursor: hasMore && last ? encodeCursor(last) : null };
}
