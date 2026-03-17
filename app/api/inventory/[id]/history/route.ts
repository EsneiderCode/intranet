import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/inventory/[id]/history
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const history = await prisma.inventoryHistory.findMany({
    where: { itemId: id },
    select: {
      id: true,
      action: true,
      notes: true,
      metadata: true,
      createdAt: true,
      fromUser: { select: { id: true, firstName: true, lastName: true } },
      toUser: { select: { id: true, firstName: true, lastName: true } },
      performedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(history);
}
