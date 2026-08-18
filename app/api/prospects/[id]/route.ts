import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { prospectListSelect } from "@/lib/prospects";

export const runtime = "nodejs";

// All fields optional — a PATCH can update just the status, just the
// opener, or any combination. At least one must be present.
const PatchSchema = z
  .object({
    status: z.enum(["new", "contacted", "replied"]),
    companyName: z.string().trim().min(1),
    website: z.string().trim(),
    signal: z.string().trim().min(1),
    signalSource: z.string().trim(),
    targetRole: z.string().trim().min(1),
    opener: z.string().trim().min(1),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { website, signalSource, ...rest } = parsed.data;

  try {
    const updated = await prisma.prospect.update({
      where: { id },
      data: {
        ...rest,
        ...(website !== undefined ? { website: website || null } : {}),
        ...(signalSource !== undefined ? { signalSource: signalSource || null } : {}),
      },
      select: prospectListSelect,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.prospect.delete({ where: { id } });
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  }
}
