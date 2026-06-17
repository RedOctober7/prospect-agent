import { prisma } from "@/lib/prisma";
import DraftForm from "./draft-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const prospects = await prisma.prospect.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      companyName: true,
      website: true,
      signal: true,
      signalSource: true,
      targetRole: true,
      opener: true,
    },
  });

  return (
    <main className="min-h-screen bg-[#0f0f12]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <h1 className="text-base font-semibold tracking-tight text-white">
              Prospect Agent
            </h1>
          </div>
          <p className="mt-1.5 pl-[18px] text-sm text-zinc-600">
            Research a company and draft a cold opener from one real signal.
          </p>
        </header>
        <DraftForm initial={prospects} />
      </div>
    </main>
  );
}
