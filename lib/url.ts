// signalSource comes from the model's web research — don't trust it as a
// bare href. Only treat it as safe to render when it's actually http(s).
export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Short label for a source link: the hostname without "www.", e.g.
// "techcrunch.com". Falls back to "source" for anything that isn't http(s).
export function sourceLabel(value: string): string {
  if (!isHttpUrl(value)) return "source";
  return new URL(value).hostname.replace(/^www\./, "");
}
