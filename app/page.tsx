import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, prospectListSelect, paginate } from "@/lib/prospects";
import DraftForm from "./draft-form";
import ThemeToggle from "./theme-toggle";
import { getAuthConfig } from "@/lib/session";

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
          <div className="flex items-center gap-2">
            {getAuthConfig() && (
              <form method="post" action="/api/logout">
                <button
                  type="submit"
                  className="h-8 rounded-md border border-line px-3 font-mono text-[11px] text-muted transition-all duration-200 hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95"
                >
                  sign out
                </button>
              </form>
            )}
            <ThemeToggle />
          </div>
        </header>
        <DraftForm initial={prospects} initialHasMore={hasMore} initialCursor={nextCursor} />
      </div>
    </main>
  );
}
