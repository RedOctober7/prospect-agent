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
} as const;
