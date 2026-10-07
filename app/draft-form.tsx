"use client";

import { useEffect, useState } from "react";
import { isHttpUrl, sourceLabel } from "@/lib/url";
import { parseCompanyLines } from "@/lib/parseLines";
import type { SearchTrace } from "@/lib/research";

export type ProspectRow = {
  id: string;
  companyName: string;
  website: string | null;
  signal: string;
  signalSource: string | null;
  targetRole: string;
  opener: string;
  status: string;
  // Only present on drafts made in this session — searches aren't persisted.
  searches?: SearchTrace[];
};

type EditableFields = {
  companyName: string;
  website: string;
  signal: string;
  signalSource: string;
  targetRole: string;
  opener: string;
};

function toEditableFields(row: ProspectRow): EditableFields {
  return {
    companyName: row.companyName,
    website: row.website ?? "",
    signal: row.signal,
    signalSource: row.signalSource ?? "",
    targetRole: row.targetRole,
    opener: row.opener,
  };
}

const NEXT_STATUS: Record<string, string> = { new: "contacted", contacted: "replied" };
const STATUS_LABEL: Record<string, string> = { new: "New", contacted: "Contacted", replied: "Replied" };
const STATUS_DOT: Record<string, string> = { new: "bg-subtle", contacted: "bg-amber-400", replied: "bg-success" };

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
  searches?: SearchTrace[];
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

// Text colors per tier, darker in light mode so each clears 4.5:1 contrast.
function scoreColor(total: number): string {
  if (total >= 13) return "text-emerald-700 dark:text-emerald-400";
  if (total >= 10) return "text-green-700 dark:text-green-400";
  if (total >= 7) return "text-yellow-700 dark:text-yellow-400";
  if (total >= 4) return "text-orange-700 dark:text-orange-400";
  return "text-red-700 dark:text-red-400";
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

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// Seconds since mount — an honest progress signal while a research call
// (up to 3 web searches) is in flight, instead of a fake step-by-step.
function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{seconds}s</span>;
}

function ResearchingLine({ verb }: { verb: string }) {
  return (
    <p className="font-mono text-[11px] text-subtle">
      <span className="text-accent">›</span> {verb}
      <span className="animate-blink">_</span> <Elapsed />
    </p>
  );
}

// The research trace: the web searches the agent actually ran for this
// draft and how each one came back, revealed one line at a time.
// `compact` drops the "web_search" label for narrow spots like table cells.
function ResearchTrace({
  searches,
  compact = false,
  className = "",
}: {
  searches: SearchTrace[];
  compact?: boolean;
  className?: string;
}) {
  if (searches.length === 0) return null;
  return (
    <ol aria-label="Web searches the agent ran" className={`flex flex-col gap-1 font-mono text-[11px] leading-relaxed ${className}`}>
      {searches.map((s, i) => (
        <li key={i} className="flex gap-2 animate-trace-in" style={{ animationDelay: `${i * 90}ms` }}>
          <span className={s.error ? "text-danger" : "text-accent"}>›</span>
          {!compact && <span className="shrink-0 text-subtle">web_search</span>}
          <span className="min-w-0 break-words text-muted">
            &ldquo;{s.query}&rdquo;{" "}
            {s.error ? (
              <span className="text-danger">· {s.error}</span>
            ) : s.results !== undefined ? (
              <span className="text-subtle">· {s.results} {s.results === 1 ? "result" : "results"}</span>
            ) : null}
            {s.viaCode && <span className="text-subtle"> · via code</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function SourceLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-[11px] text-accent underline-offset-2 transition-all duration-200 hover:underline"
    >
      ↗ {sourceLabel(href)}
    </a>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-subtle " +
  "focus:border-accent/60 focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all duration-200";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink " +
  "hover:brightness-110 hover:shadow-[0_0_0_4px_rgb(var(--accent)/0.18)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none disabled:hover:brightness-100 transition-all duration-200";

const btnGhost =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line px-3 py-1.5 text-xs font-medium text-muted " +
  "hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 " +
  "active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200";

const label = "font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-subtle";

const card = "relative overflow-hidden rounded-xl border border-line bg-surface p-5 sm:p-6 animate-fade-slide-in";
const accentBar = "absolute inset-y-0 left-0 w-0.5";

const thClass = "py-2.5 pr-6 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-subtle text-left";
const tdClass = "py-3 pr-6 align-top text-sm";

export default function DraftForm({
  initial,
  initialHasMore,
  initialCursor,
}: {
  initial: ProspectRow[];
  initialHasMore: boolean;
  initialCursor: string | null;
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
  const [cursor, setCursor] = useState(initialCursor);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditableFields | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Guards batch/signal Retry against a double-click firing two concurrent
  // requests for the same entry — each success creates a new DB row, so a
  // race there would leave duplicate prospects, not just a wasted API call.
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

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
    const { entries, skipped } = parseCompanyLines(batchText, "batch");
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
    if (batchRunning || retryingIds.has(entry.id)) return;
    setRetryingIds((prev) => new Set(prev).add(entry.id));
    try {
      await runBatchEntry(entry);
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
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
    const { entries, skipped } = parseCompanyLines(signalText, "signal");
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
    if (signalRunning || retryingIds.has(entry.id)) return;
    setRetryingIds((prev) => new Set(prev).add(entry.id));
    try {
      await runSignalEntry(entry);
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
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

  function startEdit(row: ProspectRow) {
    setEditingId(row.id);
    setEditDraft(toEditableFields(row));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    if (!editDraft) return;
    if (!editDraft.companyName.trim() || !editDraft.signal.trim() || !editDraft.targetRole.trim() || !editDraft.opener.trim()) {
      setEditError("Company, signal, target role, and opener can't be empty.");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed.");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
      setEditingId(null);
      setEditDraft(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteRow(row: ProspectRow) {
    if (!window.confirm(`Delete the draft for ${row.companyName}? This can't be undone.`)) return;
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/prospects/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch {
      setDeletingId(null);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/prospects?cursor=${encodeURIComponent(cursor)}`);
      const data = await res.json();
      setRows((prev) => [...prev, ...(data.prospects as ProspectRow[])]);
      setHasMore(Boolean(data.hasMore));
      setCursor(data.nextCursor ?? null);
    } catch {
      // Leave hasMore/cursor as-is — user can just click "Load more" again.
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
      <div className="mb-7 flex border-b border-line" role="tablist">
        {(["single", "batch", "signals"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`relative -mb-px px-4 py-2 text-sm font-medium capitalize transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
              mode === m ? "text-fg" : "text-subtle hover:text-fg"
            }`}
          >
            {m}
            {mode === m && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      {/* ── Single ── */}
      {mode === "single" && (
        <>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="flex flex-col gap-1.5">
              <span className={label}>Company name</span>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="HubSpot"
                className={`h-10 ${inputClass}`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Website</span>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="hubspot.com"
                className={`h-10 ${inputClass}`}
              />
            </label>
            <button type="submit" disabled={loading || !company.trim()} className={`h-10 ${btnPrimary}`}>
              {loading ? "Drafting…" : "Draft"}
            </button>
          </form>
          {error && (
            <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
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
              <span className="normal-case tracking-normal text-muted">Company,website.com</span>
            </span>
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={"HubSpot,hubspot.com\nSalesforce,salesforce.com\nOutreach,outreach.io"}
              rows={6}
              disabled={batchRunning}
              className={`font-mono sm:max-w-md ${inputClass} disabled:opacity-50`}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleBatchRun}
              disabled={batchRunning || !batchText.trim()}
              className={btnPrimary}
            >
              {batchRunning ? `Running… (${batchDone}/${batchTotal})` : "Run batch"}
            </button>
            {batchSkipped > 0 && (
              <span className="text-xs text-subtle">
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
              <span className="normal-case tracking-normal text-muted">Company,website.com</span>
            </span>
            <textarea
              value={signalText}
              onChange={(e) => setSignalText(e.target.value)}
              placeholder={"ASML,asml.com\nNotion,notion.so\nPipedrive,pipedrive.com"}
              rows={6}
              disabled={signalRunning}
              className={`font-mono sm:max-w-md ${inputClass} disabled:opacity-50`}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSignalRun}
              disabled={signalRunning || !signalText.trim()}
              className={btnPrimary}
            >
              {signalRunning ? `Researching… (${signalDone}/${signalTotal})` : "Run signals"}
            </button>
            {signalSkipped > 0 && (
              <span className="text-xs text-subtle">
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
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className={label}>
                {rows.length} {rows.length === 1 ? "prospect" : "prospects"}
                {hasMore ? "+" : ""}
              </span>
              <button onClick={exportProspectsCsv} className={btnGhost}>
                <DownloadIcon />
                Export CSV
              </button>
            </div>
          )}

          {mode === "single" && loading && (
            <div className={card}>
              <div className={`${accentBar} bg-accent animate-pulse`} />
              <p className="text-base font-semibold tracking-tight text-fg">{company}</p>
              <div className="mt-3">
                <ResearchingLine verb="researching" />
              </div>
            </div>
          )}

          {batchQueue.map((entry) => {
            if (entry.status === "loading") {
              return (
                <div key={entry.id} className={card}>
                  <div className={`${accentBar} bg-accent animate-pulse`} />
                  <p className="text-base font-semibold tracking-tight text-fg">{entry.company}</p>
                  <div className="mt-3">
                    <ResearchingLine verb="researching" />
                  </div>
                </div>
              );
            }
            if (entry.status === "error") {
              return (
                <div key={entry.id} className={card}>
                  <div className={`${accentBar} bg-danger`} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold tracking-tight text-fg">{entry.company}</p>
                      <p className="mt-2 text-xs text-danger">{entry.message}</p>
                    </div>
                    <button
                      onClick={() => retryBatchEntry(entry)}
                      disabled={batchRunning || retryingIds.has(entry.id)}
                      className={`shrink-0 ${btnGhost}`}
                    >
                      {retryingIds.has(entry.id) ? "Retrying…" : "Retry"}
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div key={entry.id} className={card}>
                <div className={`${accentBar} bg-line-strong`} />
                <p className="text-base font-semibold tracking-tight text-muted">{entry.company}</p>
                <p className="mt-2 font-mono text-[11px] text-subtle">queued</p>
              </div>
            );
          })}

          {rows.length === 0 && batchQueue.length === 0 && !loading && (
            <div className="flex flex-col items-center gap-3 py-20 text-subtle">
              <EmptyIcon />
              <p className="text-sm">No prospects yet — research your first company above.</p>
            </div>
          )}

          {rows.map((row) => (
            <div key={row.id} className={`${card} transition-colors duration-200 hover:border-line-strong`}>
              {/* Accent marks only what was drafted this session; saved rows stay quiet. */}
              <div className={`${accentBar} ${row.searches ? "bg-accent" : "bg-line-strong"}`} />
              <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-base font-semibold tracking-tight text-fg">{row.companyName}</span>
                <span className="text-subtle">·</span>
                <span className="text-xs text-muted">{row.targetRole}</span>
                {row.signalSource && isHttpUrl(row.signalSource) && (
                  <>
                    <span className="text-subtle">·</span>
                    <SourceLink href={row.signalSource} />
                  </>
                )}
                <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[row.status] ?? "bg-subtle"}`} />
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </div>
              {editingId === row.id && editDraft ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className={label}>Company name</span>
                      <input
                        value={editDraft.companyName}
                        onChange={(e) => setEditDraft({ ...editDraft, companyName: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={label}>Target role</span>
                      <input
                        value={editDraft.targetRole}
                        onChange={(e) => setEditDraft({ ...editDraft, targetRole: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={label}>Website</span>
                      <input
                        value={editDraft.website}
                        onChange={(e) => setEditDraft({ ...editDraft, website: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={label}>Source URL</span>
                      <input
                        value={editDraft.signalSource}
                        onChange={(e) => setEditDraft({ ...editDraft, signalSource: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className={label}>Signal</span>
                    <textarea
                      value={editDraft.signal}
                      onChange={(e) => setEditDraft({ ...editDraft, signal: e.target.value })}
                      rows={2}
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={label}>Opener</span>
                    <textarea
                      value={editDraft.opener}
                      onChange={(e) => setEditDraft({ ...editDraft, opener: e.target.value })}
                      rows={3}
                      className={inputClass}
                    />
                  </label>
                  {editError && <p className="text-xs text-danger">{editError}</p>}
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEdit} disabled={editSaving} className={btnGhost}>
                      Cancel
                    </button>
                    <button onClick={() => saveEdit(row.id)} disabled={editSaving} className={btnPrimary}>
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {row.searches && row.searches.length > 0 && (
                    <div className="mb-4">
                      <p className={`${label} mb-1.5`}>Research</p>
                      <ResearchTrace searches={row.searches} />
                    </div>
                  )}
                  <div className="mb-4">
                    <p className={`${label} mb-1.5`}>Signal</p>
                    <p className="text-sm leading-relaxed text-muted">{row.signal}</p>
                  </div>
                  <div className="rounded-lg bg-surface-2 px-4 py-4">
                    <p className={`${label} mb-2`}>Opener</p>
                    <p className="text-[15px] leading-relaxed text-fg">{row.opener}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {NEXT_STATUS[row.status] && (
                      <button onClick={() => advanceStatus(row)} className={btnGhost}>
                        Mark {STATUS_LABEL[NEXT_STATUS[row.status]]}
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(row)}
                      disabled={editingId !== null}
                      title={editingId !== null ? "Finish or cancel the current edit first" : undefined}
                      className={btnGhost}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteRow(row)}
                      disabled={deletingId === row.id || editingId !== null}
                      className={`${btnGhost} hover:border-danger/50 hover:text-danger`}
                    >
                      {deletingId === row.id ? "Deleting…" : "Delete"}
                    </button>
                    <button
                      onClick={() => copyOpener(row)}
                      className={
                        copiedId === row.id
                          ? `${btnGhost} border-success/40 bg-success/10 text-success hover:border-success/40 hover:text-success`
                          : btnGhost
                      }
                    >
                      {copiedId === row.id ? <><CheckIcon />Copied!</> : <><CopyIcon />Copy</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {hasMore && rows.length > 0 && (
            <div className="flex justify-center pt-2">
              <button onClick={loadMore} disabled={loadingMore} className={`${btnGhost} px-4 py-2 text-sm`}>
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
            <div className="mb-3 flex justify-end">
              <button onClick={exportSignalsCsv} className={btnGhost}>
                <DownloadIcon />
                Export CSV
              </button>
            </div>
          )}
          {signalQueue.length === 0 && signalResults.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-subtle">
              <EmptyIcon />
              <p className="text-sm">No signals yet — paste companies above and run.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-2">
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
                    <tr key={entry.id} className="border-b border-line bg-bg">
                      <td className={`${tdClass} pl-5 font-semibold text-fg`}>{entry.company}</td>
                      {entry.status === "loading" ? (
                        <td colSpan={4} className={tdClass}>
                          <ResearchingLine verb="researching" />
                        </td>
                      ) : entry.status === "error" ? (
                        <td colSpan={4} className={`${tdClass} text-danger`}>
                          <div className="flex items-center justify-between gap-3">
                            <span>{entry.message}</span>
                            <button
                              onClick={() => retrySignalEntry(entry)}
                              disabled={signalRunning || retryingIds.has(entry.id)}
                              className={`shrink-0 ${btnGhost}`}
                            >
                              {retryingIds.has(entry.id) ? "Retrying…" : "Retry"}
                            </button>
                          </div>
                        </td>
                      ) : (
                        <td colSpan={4} className={`${tdClass} font-mono text-[11px] text-subtle`}>queued</td>
                      )}
                    </tr>
                  ))}
                  {/* Completed results sorted by score descending */}
                  {sortedSignals.map((result) => (
                    <tr key={result.id} className="border-b border-line bg-surface transition-colors duration-150 hover:bg-surface-2 animate-fade-slide-in">
                      <td className={`${tdClass} pl-5 font-semibold text-fg`}>{result.companyName}</td>
                      <td className={tdClass}>
                        <div className="flex items-baseline gap-2">
                          <span className={`font-mono text-xl font-semibold tabular-nums ${scoreColor(result.total)}`}>
                            {result.total}
                          </span>
                          <span className="whitespace-nowrap font-mono text-[10px] text-subtle">
                            R{result.recency} T{result.triggerStrength} S{result.specificity}
                          </span>
                        </div>
                        <p className="mt-1 max-w-[160px] text-[11px] leading-snug text-subtle">
                          {result.scoreReason}
                        </p>
                      </td>
                      <td className={`${tdClass} min-w-[16rem] max-w-sm text-muted`}>
                        <p className="leading-relaxed">{result.signal}</p>
                        {result.searches && result.searches.length > 0 && (
                          <details className="group mt-2">
                            <summary className="cursor-pointer list-none font-mono text-[11px] text-subtle transition-colors duration-200 hover:text-fg [&::-webkit-details-marker]:hidden">
                              <span className="inline-block text-accent transition-transform duration-200 group-open:rotate-90">›</span>{" "}
                              {result.searches.length} web {result.searches.length === 1 ? "search" : "searches"}
                              {result.searches.some((s) => s.error) && (
                                <span className="text-danger">
                                  {" "}· {result.searches.filter((s) => s.error).length} failed
                                </span>
                              )}
                            </summary>
                            <ResearchTrace searches={result.searches} compact className="mt-1.5 pl-3" />
                          </details>
                        )}
                      </td>
                      {/* Roles can come back long ("VP of Partnerships / Alliances (or ...)"),
                          so let them wrap instead of starving the Signal column. */}
                      <td className={`${tdClass} min-w-[8rem] max-w-[12rem] text-muted`}>{result.targetRole}</td>
                      <td className={tdClass}>
                        {result.signalSource && isHttpUrl(result.signalSource) ? (
                          <span className="whitespace-nowrap">
                            <SourceLink href={result.signalSource} />
                          </span>
                        ) : (
                          <span className="text-subtle">—</span>
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
