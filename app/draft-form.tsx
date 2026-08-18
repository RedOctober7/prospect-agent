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
  status: string;
};

const NEXT_STATUS: Record<string, string> = { new: "contacted", contacted: "replied" };
const STATUS_LABEL: Record<string, string> = { new: "New", contacted: "Contacted", replied: "Replied" };
const STATUS_DOT: Record<string, string> = { new: "bg-zinc-500", contacted: "bg-amber-400", replied: "bg-emerald-400" };

type BatchEntry =
  | { id: string; status: "pending"; company: string; website: string }
  | { id: string; status: "loading"; company: string; website: string }
  | { id: string; status: "error"; company: string; website: string; message: string };

type SignalResult = {
  id: string;
  companyName: string;
  signal: string;
  signalSource: string;
  targetRole: string;
  recency: number;
  triggerStrength: number;
  specificity: number;
  total: number;
  scoreReason: string;
};

type SignalEntry =
  | { id: string; status: "pending"; company: string; website: string }
  | { id: string; status: "loading"; company: string; website: string }
  | { id: string; status: "error"; company: string; website: string; message: string };

function escapeCell(val: string | number | null | undefined): string {
  const s = String(val ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, headers: string[], rowData: (string | number | null | undefined)[][]) {
  const lines = [headers, ...rowData]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// signalSource comes from the model's web research — don't trust it as a
// bare href. Only render it as a link when it's actually http(s).
function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function scoreColor(total: number): string {
  if (total >= 13) return "text-emerald-400";
  if (total >= 10) return "text-green-400";
  if (total >= 7) return "text-yellow-400";
  if (total >= 4) return "text-orange-400";
  return "text-red-400";
}

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

const thClass = "py-2.5 pr-6 text-[10px] font-semibold uppercase tracking-widest text-zinc-600 text-left";
const tdClass = "py-3 pr-6 align-top text-sm";

export default function DraftForm({
  initial,
  initialHasMore,
}: {
  initial: ProspectRow[];
  initialHasMore: boolean;
}) {
  const [mode, setMode] = useState<"single" | "batch" | "signals">("single");

  // Single mode
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Batch mode
  const [batchText, setBatchText] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchQueue, setBatchQueue] = useState<BatchEntry[]>([]);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);
  const [batchSkipped, setBatchSkipped] = useState(0);

  // Signals mode
  const [signalText, setSignalText] = useState("");
  const [signalRunning, setSignalRunning] = useState(false);
  const [signalQueue, setSignalQueue] = useState<SignalEntry[]>([]);
  const [signalResults, setSignalResults] = useState<SignalResult[]>([]);
  const [signalTotal, setSignalTotal] = useState(0);
  const [signalDone, setSignalDone] = useState(0);
  const [signalSkipped, setSignalSkipped] = useState(0);

  // Shared
  const [rows, setRows] = useState<ProspectRow[]>(initial);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

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

  function parseBatchLines(text: string): { entries: BatchEntry[]; skipped: number } {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const seen = new Set<string>();
    const entries: BatchEntry[] = [];
    let skipped = 0;
    lines.forEach((line, i) => {
      const commaIdx = line.indexOf(",");
      const co = commaIdx >= 0 ? line.slice(0, commaIdx).trim() : line.trim();
      const site = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : "";
      const key = co.toLowerCase();
      if (seen.has(key)) {
        skipped++;
        return;
      }
      seen.add(key);
      entries.push({ id: `batch-${Date.now()}-${i}`, status: "pending", company: co, website: site });
    });
    return { entries, skipped };
  }

  async function runBatchEntry(entry: BatchEntry) {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Draft failed.";
      setBatchQueue((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { id: entry.id, status: "error", company: entry.company, website: entry.website, message }
            : e
        )
      );
    }
  }

  async function handleBatchRun() {
    if (batchRunning) return;
    const { entries, skipped } = parseBatchLines(batchText);
    if (entries.length === 0) return;

    setBatchQueue(entries);
    setBatchTotal(entries.length);
    setBatchDone(0);
    setBatchSkipped(skipped);
    setBatchRunning(true);

    for (const entry of entries) {
      await runBatchEntry(entry);
      setBatchDone((n) => n + 1);
    }
    setBatchRunning(false);
  }

  async function retryBatchEntry(entry: BatchEntry) {
    if (batchRunning) return;
    await runBatchEntry(entry);
  }

  function parseSignalLines(text: string): { entries: SignalEntry[]; skipped: number } {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const seen = new Set<string>();
    const entries: SignalEntry[] = [];
    let skipped = 0;
    lines.forEach((line, i) => {
      const commaIdx = line.indexOf(",");
      const co = commaIdx >= 0 ? line.slice(0, commaIdx).trim() : line.trim();
      const site = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : "";
      const key = co.toLowerCase();
      if (seen.has(key)) {
        skipped++;
        return;
      }
      seen.add(key);
      entries.push({ id: `signal-${Date.now()}-${i}`, status: "pending", company: co, website: site });
    });
    return { entries, skipped };
  }

  async function runSignalEntry(entry: SignalEntry) {
    setSignalQueue((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? { id: entry.id, status: "loading", company: entry.company, website: entry.website }
          : e
      )
    );
    try {
      const res = await fetch("/api/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: entry.company, website: entry.website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Research failed.");
      setSignalResults((prev) => [...prev.filter((r) => r.id !== entry.id), { id: entry.id, ...data } as SignalResult]);
      setSignalQueue((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Research failed.";
      setSignalQueue((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { id: entry.id, status: "error", company: entry.company, website: entry.website, message }
            : e
        )
      );
    }
  }

  async function handleSignalRun() {
    if (signalRunning) return;
    const { entries, skipped } = parseSignalLines(signalText);
    if (entries.length === 0) return;

    setSignalQueue(entries);
    setSignalResults([]);
    setSignalTotal(entries.length);
    setSignalDone(0);
    setSignalSkipped(skipped);
    setSignalRunning(true);

    for (const entry of entries) {
      await runSignalEntry(entry);
      setSignalDone((n) => n + 1);
    }
    setSignalRunning(false);
  }

  async function retrySignalEntry(entry: SignalEntry) {
    if (signalRunning) return;
    await runSignalEntry(entry);
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

  async function advanceStatus(row: ProspectRow) {
    const next = NEXT_STATUS[row.status];
    if (!next) return;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    try {
      const res = await fetch(`/api/prospects/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)));
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore || rows.length === 0) return;
    setLoadingMore(true);
    try {
      const cursor = rows[rows.length - 1].id;
      const res = await fetch(`/api/prospects?cursor=${encodeURIComponent(cursor)}`);
      const data = await res.json();
      setRows((prev) => [...prev, ...(data.prospects as ProspectRow[])]);
      setHasMore(Boolean(data.hasMore));
    } catch {
      // Leave hasMore as-is — user can just click "Load more" again.
    } finally {
      setLoadingMore(false);
    }
  }

  const sortedSignals = [...signalResults].sort((a, b) => b.total - a.total);

  function exportProspectsCsv() {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `prospects-${date}.csv`,
      ["Company", "Signal", "Source", "Target Role", "Opener"],
      rows.map((r) => [r.companyName, r.signal, r.signalSource ?? "", r.targetRole, r.opener])
    );
  }

  function exportSignalsCsv() {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `prospects-${date}.csv`,
      ["Company", "Total", "Recency", "Trigger", "Specificity", "Signal", "Source", "Target Role", "Score Reason"],
      sortedSignals.map((r) => [
        r.companyName, r.total, r.recency, r.triggerStrength, r.specificity,
        r.signal, r.signalSource, r.targetRole, r.scoreReason,
      ])
    );
  }

  return (
    <div>
      {/* Mode tabs */}
      <div className="mb-7 flex border-b border-[#27272a]">
        {(["single", "batch", "signals"] as const).map((m) => (
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

      {/* ── Single ── */}
      {mode === "single" && (
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
      )}

      {/* ── Batch ── */}
      {mode === "batch" && (
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
          <div className="flex items-center gap-3">
            <button
              onClick={handleBatchRun}
              disabled={batchRunning || !batchText.trim()}
              className={btnPrimary}
            >
              {batchRunning ? `Running… (${batchDone}/${batchTotal})` : "Run batch"}
            </button>
            {batchSkipped > 0 && (
              <span className="text-xs text-zinc-600">
                {batchSkipped} duplicate {batchSkipped === 1 ? "line" : "lines"} skipped
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Signals ── */}
      {mode === "signals" && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>
              One per line —{" "}
              <span className="font-mono normal-case tracking-normal text-[#a1a1aa]">
                Company,website.com
              </span>
            </span>
            <textarea
              value={signalText}
              onChange={(e) => setSignalText(e.target.value)}
              placeholder={"ASML,asml.com\nNotion,notion.so\nPipedrive,pipedrive.com"}
              rows={6}
              disabled={signalRunning}
              className={`max-w-md font-mono ${inputClass} disabled:opacity-50`}
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSignalRun}
              disabled={signalRunning || !signalText.trim()}
              className={btnPrimary}
            >
              {signalRunning ? `Researching… (${signalDone}/${signalTotal})` : "Run signals"}
            </button>
            {signalSkipped > 0 && (
              <span className="text-xs text-zinc-600">
                {signalSkipped} duplicate {signalSkipped === 1 ? "line" : "lines"} skipped
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Single / Batch result cards ── */}
      {(mode === "single" || mode === "batch") && (
        <div className="mt-10 flex flex-col gap-3">
          {rows.length > 0 && (
            <div className="flex justify-end mb-1">
              <button onClick={exportProspectsCsv} className="flex items-center gap-1.5 rounded-md border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white transition-all duration-200">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export CSV
              </button>
            </div>
          )}
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
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold tracking-tight text-white">{entry.company}</p>
                      <p className="mt-2 text-xs text-red-400">{entry.message}</p>
                    </div>
                    <button
                      onClick={() => retryBatchEntry(entry)}
                      disabled={batchRunning}
                      className="shrink-0 rounded-md border border-[#27272a] px-2.5 py-1 text-xs text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200"
                    >
                      Retry
                    </button>
                  </div>
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

          {rows.length === 0 && batchQueue.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-zinc-700">
              <EmptyIcon />
              <p className="text-sm">No prospects yet — research your first company above.</p>
            </div>
          )}

          {rows.map((row) => (
            <div
              key={row.id}
              className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.5)] hover:border-[#3f3f46] transition-all duration-200 animate-fade-slide-in"
            >
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-violet-500" />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
                <span className="text-base font-bold tracking-tight text-white">{row.companyName}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-[#a1a1aa]">{row.targetRole}</span>
                {row.signalSource && isHttpUrl(row.signalSource) && (
                  <>
                    <span className="text-zinc-600">·</span>
                    <a href={row.signalSource} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition-all duration-200">
                      source ↗
                    </a>
                  </>
                )}
                <span className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[row.status] ?? "bg-zinc-500"}`} />
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </div>
              <div className="mb-4">
                <p className={`${label} mb-1.5`}>Signal</p>
                <p className="text-xs leading-relaxed text-[#a1a1aa]">{row.signal}</p>
              </div>
              <div className="rounded-lg bg-[#1e1e22] px-4 py-4">
                <p className={`${label} mb-2`}>Opener</p>
                <p className="text-sm leading-relaxed text-[#fafafa]">{row.opener}</p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {NEXT_STATUS[row.status] && (
                  <button
                    onClick={() => advanceStatus(row)}
                    className="rounded-md border border-[#27272a] px-3 py-1.5 text-xs font-medium text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white active:scale-95 transition-all duration-200"
                  >
                    Mark {STATUS_LABEL[NEXT_STATUS[row.status]]}
                  </button>
                )}
                <button
                  onClick={() => copyOpener(row)}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium active:scale-95 transition-all duration-200 ${
                    copiedId === row.id
                      ? "border-emerald-700/50 bg-emerald-950/30 text-emerald-400"
                      : "border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white"
                  }`}
                >
                  {copiedId === row.id ? <><CheckIcon />Copied!</> : <><CopyIcon />Copy</>}
                </button>
              </div>
            </div>
          ))}

          {hasMore && rows.length > 0 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-lg border border-[#27272a] px-4 py-2 text-sm text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Signals results table ── */}
      {mode === "signals" && (
        <div className="mt-8">
          {signalResults.length > 0 && (
            <div className="flex justify-end mb-3">
              <button onClick={exportSignalsCsv} className="flex items-center gap-1.5 rounded-md border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white transition-all duration-200">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export CSV
              </button>
            </div>
          )}
          {signalQueue.length === 0 && signalResults.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-zinc-700">
              <EmptyIcon />
              <p className="text-sm">No signals yet — paste companies above and run.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#27272a]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#27272a] bg-[#18181b]">
                    <th className={`${thClass} pl-5`}>Company</th>
                    <th className={thClass}>Score</th>
                    <th className={thClass}>Signal</th>
                    <th className={thClass}>Target role</th>
                    <th className={thClass}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {/* In-flight queue entries */}
                  {signalQueue.map((entry) => (
                    <tr key={entry.id} className="border-b border-[#27272a] bg-[#0f0f12]">
                      <td className={`${tdClass} pl-5 font-semibold text-white`}>{entry.company}</td>
                      {entry.status === "loading" ? (
                        <td colSpan={4} className={`${tdClass} italic text-[#a1a1aa]`}>Researching…</td>
                      ) : entry.status === "error" ? (
                        <td colSpan={4} className={`${tdClass} text-red-400`}>
                          <div className="flex items-center justify-between gap-3">
                            <span>{entry.message}</span>
                            <button
                              onClick={() => retrySignalEntry(entry)}
                              disabled={signalRunning}
                              className="shrink-0 rounded-md border border-[#27272a] px-2.5 py-1 text-xs text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200"
                            >
                              Retry
                            </button>
                          </div>
                        </td>
                      ) : (
                        <td colSpan={4} className={`${tdClass} text-zinc-600`}>Queued</td>
                      )}
                    </tr>
                  ))}
                  {/* Completed results sorted by score descending */}
                  {sortedSignals.map((result) => (
                    <tr key={result.id} className="border-b border-[#27272a] bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-150 animate-fade-slide-in">
                      <td className={`${tdClass} pl-5 font-semibold text-white`}>{result.companyName}</td>
                      <td className={tdClass}>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-xl font-bold tabular-nums ${scoreColor(result.total)}`}>
                            {result.total}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-600 whitespace-nowrap">
                            R{result.recency} T{result.triggerStrength} S{result.specificity}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] leading-snug text-zinc-600 max-w-[160px]">
                          {result.scoreReason}
                        </p>
                      </td>
                      <td className={`${tdClass} text-[#a1a1aa] max-w-xs`}>
                        <p className="leading-relaxed">{result.signal}</p>
                      </td>
                      <td className={`${tdClass} text-[#a1a1aa] whitespace-nowrap`}>{result.targetRole}</td>
                      <td className={tdClass}>
                        {result.signalSource && isHttpUrl(result.signalSource) ? (
                          <a
                            href={result.signalSource}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition-all duration-200 whitespace-nowrap"
                          >
                            source ↗
                          </a>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
