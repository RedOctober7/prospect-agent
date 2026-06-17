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

export default function DraftForm({ initial }: { initial: ProspectRow[] }) {
  const [mode, setMode] = useState<"single" | "batch">("single");

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

  // Shared
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
      setTimeout(() => setCopiedId((id) => (id === row.id ? null : id)), 1500);
    } catch {
      // Clipboard denied — skip confirmation.
    }
  }

  return (
    <div>
      {/* Mode tabs */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setMode("single")}
          className={`px-4 py-2 text-sm font-medium ${
            mode === "single"
              ? "border-b-2 border-gray-900 text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Single
        </button>
        <button
          onClick={() => setMode("batch")}
          className={`px-4 py-2 text-sm font-medium ${
            mode === "batch"
              ? "border-b-2 border-gray-900 text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Batch
        </button>
      </div>

      {mode === "single" ? (
        <>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-600">Company name</span>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="HubSpot"
                className="w-56 rounded border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-600">Website</span>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="hubspot.com"
                className="w-56 rounded border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={loading || !company.trim()}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Drafting…" : "Draft"}
            </button>
          </form>
          {error && (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-gray-600">
              One company per line — <span className="font-mono">Company,website.com</span>
            </span>
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={"HubSpot,hubspot.com\nSalesforce,salesforce.com\nOutreach,outreach.io"}
              rows={6}
              disabled={batchRunning}
              className="w-full max-w-md rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-gray-500 focus:outline-none disabled:bg-gray-50"
            />
          </label>
          <div>
            <button
              onClick={handleBatchRun}
              disabled={batchRunning || !batchText.trim()}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {batchRunning
                ? `Running… (${batchDone}/${batchTotal})`
                : "Run batch"}
            </button>
          </div>
        </div>
      )}

      {/* Results table — batch queue rows first, then completed rows */}
      <div className="mt-8 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-gray-600">
              <th className="py-2 pr-4 font-medium">Company</th>
              <th className="py-2 pr-4 font-medium">Signal</th>
              <th className="py-2 pr-4 font-medium">Source</th>
              <th className="py-2 pr-4 font-medium">Target role</th>
              <th className="py-2 pr-4 font-medium">Opener</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {batchQueue.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-200 align-top bg-gray-50">
                <td className="py-3 pr-4 font-medium text-gray-700">{entry.company}</td>
                {entry.status === "loading" ? (
                  <td colSpan={4} className="py-3 pr-4 italic text-gray-400">
                    Drafting…
                  </td>
                ) : entry.status === "error" ? (
                  <td colSpan={4} className="py-3 pr-4 text-red-600">
                    {entry.message}
                  </td>
                ) : (
                  <td colSpan={4} className="py-3 pr-4 text-gray-400">
                    Queued
                  </td>
                )}
                <td className="py-3" />
              </tr>
            ))}

            {rows.length === 0 && batchQueue.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-400">
                  No prospects yet. Draft one above.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-200 align-top">
                  <td className="py-3 pr-4 font-medium">{row.companyName}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.signal}</td>
                  <td className="py-3 pr-4">
                    {row.signalSource ? (
                      <a
                        href={row.signalSource}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-blue-600 hover:underline"
                      >
                        link
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{row.targetRole}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.opener}</td>
                  <td className="py-3">
                    <button
                      onClick={() => copyOpener(row)}
                      className="whitespace-nowrap rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
                    >
                      {copiedId === row.id ? "Copied" : "Copy"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
