"use client";

import { useState } from "react";

const inputClass =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-subtle " +
  "focus:border-accent/60 focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all duration-200";

const label = "font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-subtle";

// A plain form POST to /api/login (works without JS); the client part only
// adds the "Signing in…" state so a slow round trip doesn't look frozen.
export default function LoginForm({ failed }: { failed: boolean }) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      method="post"
      action="/api/login"
      onSubmit={() => setSubmitting(true)}
      className="mt-8 flex flex-col gap-4 rounded-xl border border-line bg-surface p-6"
    >
      <label className="flex flex-col gap-1.5">
        <span className={label}>Username</span>
        <input
          name="username"
          autoComplete="username"
          autoFocus
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>

      {failed && !submitting && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          Wrong username or password.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={
          "mt-1 inline-flex h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink " +
          "hover:brightness-110 hover:shadow-[0_0_0_4px_rgb(var(--accent)/0.18)] " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface " +
          "active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 transition-all duration-200"
        }
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
