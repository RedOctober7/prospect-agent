import { prisma } from "@/lib/prisma";
import DraftForm from "./draft-form";

// Read fresh from the database on every load; never statically cache.
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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Prospect Agent</h1>
      <p className="mt-2 text-gray-600">
        Enter a company and website to research one real signal and draft a cold
        opener.
      </p>
      <div className="mt-8">
        <DraftForm initial={prospects} />
      </div>
    </main>
  );
}
