import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/inventory/[id]/photos/[photoId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, photoId } = await params;

  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Technician can only modify items assigned to them
  if (session.user.role === "TECHNICIAN" && item.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const photo = await prisma.inventoryItemPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.itemId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.inventoryItemPhoto.delete({ where: { id: photoId } });

  return NextResponse.json({ success: true });
}
