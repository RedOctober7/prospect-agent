import { NextResponse } from "next/server";
import { researchSignal } from "@/lib/research";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let company: unknown;
  let website: unknown;
  try {
    ({ company, website } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof company !== "string" || !company.trim()) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }
  const site = typeof website === "string" ? website.trim() : "";

  try {
    const signal = await researchSignal(company.trim(), site);
    return NextResponse.json(signal);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
