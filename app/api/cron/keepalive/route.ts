import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorizedCron } from "@/lib/cron";

export const runtime = "nodejs";

// Called by Vercel Cron (schedules in vercel.json) so the Supabase free-tier
// project doesn't get paused after a week without database activity.
// proxy.ts lets this path through without a session, so the CRON_SECRET
// check below is its only gate. Read-only on purpose: even a stray call
// can't change data or cost anything.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    if (!process.env.CRON_SECRET) console.error("[keepalive] CRON_SECRET is not set.");
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    // A real read of the table, not a bare SELECT 1: Supabase counts user
    // queries against the database, and a connection alone doesn't count.
    await prisma.prospect.findFirst({ select: { id: true } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // A paused project fails here; the cron can't resume it (Supabase
    // dashboard → Restore project). Non-2xx so the run shows as failed.
    const message = err instanceof Error ? err.message : "Keep-alive query failed.";
    console.error("[keepalive]", message);
    return NextResponse.json({ error: "Keep-alive query failed." }, { status: 500 });
  }
}
