import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_STATUSES = new Set(["new", "contacted", "replied"]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let status: unknown;
  try {
    ({ status } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "status must be one of: new, contacted, replied." },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.prospect.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  }
}
