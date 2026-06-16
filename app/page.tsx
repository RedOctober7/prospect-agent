export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Prospect Agent</h1>
      <p className="mt-2 text-gray-600">
        Phase 0 scaffold is running. The research engine lives in{" "}
        <code className="rounded bg-gray-200 px-1 py-0.5 text-sm">lib/research.ts</code>;
        run it from the terminal with{" "}
        <code className="rounded bg-gray-200 px-1 py-0.5 text-sm">npm run draft</code>.
        The browser UI arrives in Phase 2.
      </p>
    </main>
  );
}
