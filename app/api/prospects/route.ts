import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, prospectListSelect, decodeCursor, paginate } from "@/lib/prospects";

export const runtime = "nodejs";

// Cursor pagination for "load more" on the saved-prospects list.
export async function GET(req: Request) {
  const cursorParam = new URL(req.url).searchParams.get("cursor");
  const cursor = cursorParam ? decodeCursor(cursorParam) : null;
  if (cursorParam && !cursor) {
    return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
  }

  const items = await prisma.prospect.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    select: prospectListSelect,
    ...(cursor
      ? {
          where: {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          },
        }
      : {}),
  });

  const { items: prospects, hasMore, nextCursor } = paginate(items);
  return NextResponse.json({ prospects, hasMore, nextCursor });
}
