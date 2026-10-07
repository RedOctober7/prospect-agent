import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, prospectListSelect, paginate } from "@/lib/prospects";
import DraftForm from "./draft-form";
import ThemeToggle from "./theme-toggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  const items = await prisma.prospect.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    select: prospectListSelect,
  });
  const { items: prospects, hasMore, nextCursor } = paginate(items);

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle">
              research <span className="text-accent">→</span> signal <span className="text-accent">→</span> opener
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">Prospect Agent</h1>
            <p className="mt-1.5 text-sm text-muted">
              Research a company and draft a cold opener from one real signal.
            </p>
          </div>
          <ThemeToggle />
        </header>
        <DraftForm initial={prospects} initialHasMore={hasMore} initialCursor={nextCursor} />
      </div>
    </main>
  );
}
