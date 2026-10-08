import { safeEqual } from "./session";

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" on every run.
// Fails closed: with CRON_SECRET unset or empty nothing is authorized, so
// the header "Bearer undefined" can't get in.
export function isAuthorizedCron(authorization: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  return safeEqual(authorization ?? "", `Bearer ${secret}`);
}
