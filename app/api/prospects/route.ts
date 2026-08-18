import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, prospectListSelect } from "@/lib/prospects";

export const runtime = "nodejs";

// Cursor pagination for "load more" on the saved-prospects list.
export async function GET(req: Request) {
  const cursor = new URL(req.url).searchParams.get("cursor");

  const items = await prisma.prospect.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    select: prospectListSelect,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > PAGE_SIZE;
  return NextResponse.json({
    prospects: hasMore ? items.slice(0, PAGE_SIZE) : items,
    hasMore,
  });
}
