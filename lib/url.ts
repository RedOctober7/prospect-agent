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
