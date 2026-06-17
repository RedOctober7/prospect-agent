"use client";

import { useState } from "react";

export type ProspectRow = {
  id: string;
  companyName: string;
  website: string | null;
  signal: string;
  signalSource: string | null;
  targetRole: string;
  opener: string;
};

type BatchEntry =
  | { id: string; status: "pending"; company: string; website: string }
  | { id: string; status: "loading"; company: string; website: string }
  | { id: string; status: "error"; company: string; website: string; message: string };

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

const inputClass =
  "rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-sm text-white placeholder-zinc-600 " +
  "focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all duration-200";

const btnPrimary =
  "rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white " +
  "hover:from-indigo-400 hover:to-violet-400 hover:shadow-[0_0_24px_rgba(139,92,246,0.45)] " +
  "active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200";

const label = "text-[10px] font-semibold uppercase tracking-widest text-zinc-600";

export default function DraftForm({ initial }: { initial: ProspectRow[] }) {
  const [mode, setMode] = useState<"single" | "batch">("single");

  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [batchText, setBatchText] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchQueue, setBatchQueue] = useState<BatchEntry[]>([]);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);

  const [rows, setRows] = useState<ProspectRow[]>(initial);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Draft failed.");
      setRows((prev) => [data as ProspectRow, ...prev]);
      setCompany("");
      setWebsite("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBatchRun() {
    if (batchRunning) return;
    const lines = batchText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const entries: BatchEntry[] = lines.map((line, i) => {
      const commaIdx = line.indexOf(",");
      const co = commaIdx >= 0 ? line.slice(0, commaIdx).trim() : line.trim();
      const site = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : "";
      return { id: `batch-${Date.now()}-${i}`, status: "pending", company: co, website: site };
    });

    setBatchQueue(entries);
    setBatchTotal(entries.length);
    setBatchDone(0);
    setBatchRunning(true);

    for (const entry of entries) {
      setBatchQueue((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { id: entry.id, status: "loading", company: entry.company, website: entry.website }
            : e
        )
      );

      try {
        const res = await fetch("/api/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company: entry.company, website: entry.website }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Draft failed.");
        setRows((prev) => [data as ProspectRow, ...prev]);
        setBatchQueue((prev) => prev.filter((e) => e.id !== entry.id));
        setBatchDone((n) => n + 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Draft failed.";
        setBatchQueue((prev) =>
          prev.map((e) =>
            e.id === entry.id
              ? { id: entry.id, status: "error", company: entry.company, website: entry.website, message }
              : e
          )
        );
        setBatchDone((n) => n + 1);
      }
    }

    setBatchRunning(false);
  }

  async function copyOpener(row: ProspectRow) {
    try {
      await navigator.clipboard.writeText(row.opener);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId((id) => (id === row.id ? null : id)), 2000);
    } catch {
      // Clipboard denied — skip confirmation.
    }
  }

  return (
    <div>
      {/* Mode tabs */}
      <div className="mb-7 flex border-b border-[#27272a]">
        {(["single", "batch"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`relative -mb-px px-4 py-2 text-sm font-medium capitalize transition-all duration-200 ${
              mode === m ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {m}
            {mode === m && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
            )}
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={label}>Company name</span>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="HubSpot"
                className={`w-52 ${inputClass}`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Website</span>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="hubspot.com"
                className={`w-52 ${inputClass}`}
              />
            </label>
            <button type="submit" disabled={loading || !company.trim()} className={btnPrimary}>
              {loading ? "Drafting…" : "Draft"}
            </button>
          </form>
          {error && (
            <p className="mt-3 rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>
              One per line —{" "}
              <span className="font-mono normal-case tracking-normal text-[#a1a1aa]">
                Company,website.com
              </span>
            </span>
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={"HubSpot,hubspot.com\nSalesforce,salesforce.com\nOutreach,outreach.io"}
              rows={6}
              disabled={batchRunning}
              className={`max-w-md font-mono ${inputClass} disabled:opacity-50`}
            />
          </label>
          <div>
            <button
              onClick={handleBatchRun}
              disabled={batchRunning || !batchText.trim()}
              className={btnPrimary}
            >
              {batchRunning ? `Running… (${batchDone}/${batchTotal})` : "Run batch"}
            </button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="mt-10 flex flex-col gap-3">
        {/* Batch queue state cards */}
        {batchQueue.map((entry) => {
          const base =
            "relative overflow-hidden rounded-xl border border-[#27272a] bg-[#18181b] p-6 " +
            "shadow-[0_2px_16px_rgba(0,0,0,0.5)] animate-fade-slide-in";

          if (entry.status === "loading") {
            return (
              <div key={entry.id} className={base}>
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-violet-500" />
                <p className="text-sm font-bold tracking-tight text-white">{entry.company}</p>
                <p className="mt-2 text-xs italic text-[#a1a1aa]">Drafting…</p>
              </div>
            );
          }
          if (entry.status === "error") {
            return (
              <div key={entry.id} className={base}>
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-500 to-red-600" />
                <p className="text-sm font-bold tracking-tight text-white">{entry.company}</p>
                <p className="mt-2 text-xs text-red-400">{entry.message}</p>
              </div>
            );
          }
          return (
            <div key={entry.id} className={base}>
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-zinc-700" />
              <p className="text-sm font-bold tracking-tight text-zinc-400">{entry.company}</p>
              <p className="mt-2 text-xs text-zinc-600">Queued</p>
            </div>
          );
        })}

        {/* Empty state */}
        {rows.length === 0 && batchQueue.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-zinc-700">
            <EmptyIcon />
            <p className="text-sm">No prospects yet — research your first company above.</p>
          </div>
        )}

        {/* Completed prospect cards */}
        {rows.map((row) => (
          <div
            key={row.id}
            className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.5)] hover:border-[#3f3f46] transition-all duration-200 animate-fade-slide-in"
          >
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-violet-500" />

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
              <span className="text-base font-bold tracking-tight text-white">{row.companyName}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-xs text-[#a1a1aa]">{row.targetRole}</span>
              {row.signalSource && (
                <>
                  <span className="text-zinc-600">·</span>
                  <a
                    href={row.signalSource}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition-all duration-200"
                  >
                    source ↗
                  </a>
                </>
              )}
            </div>

            {/* Signal */}
            <div className="mb-4">
              <p className={`${label} mb-1.5`}>Signal</p>
              <p className="text-xs leading-relaxed text-[#a1a1aa]">{row.signal}</p>
            </div>

            {/* Opener container */}
            <div className="rounded-lg bg-[#1e1e22] px-4 py-4">
              <p className={`${label} mb-2`}>Opener</p>
              <p className="text-sm leading-relaxed text-[#fafafa]">{row.opener}</p>
            </div>

            {/* Copy */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => copyOpener(row)}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium active:scale-95 transition-all duration-200 ${
                  copiedId === row.id
                    ? "border-emerald-700/50 bg-emerald-950/30 text-emerald-400"
                    : "border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white"
                }`}
              >
                {copiedId === row.id ? (
                  <>
                    <CheckIcon />
                    Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
