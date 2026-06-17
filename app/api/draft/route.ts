import { NextResponse } from "next/server";
import { researchAndDraft } from "@/lib/research";
import { prisma } from "@/lib/prisma";

// Prisma + the Anthropic SDK need the Node.js runtime, not edge.
export const runtime = "nodejs";
// A single research call can run up to 3 web searches; give it room.
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
    return NextResponse.json(
      { error: "Company name is required." },
      { status: 400 }
    );
  }
  const site = typeof website === "string" ? website.trim() : "";

  try {
    const draft = await researchAndDraft(company.trim(), site);
    const saved = await prisma.prospect.create({
      data: {
        companyName: draft.companyName || company.trim(),
        website: site || null,
        signal: draft.signal,
        signalSource: draft.signalSource || null,
        targetRole: draft.targetRole,
        opener: draft.opener,
      },
    });
    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Draft failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
