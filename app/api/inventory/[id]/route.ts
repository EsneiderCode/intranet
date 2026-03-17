import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateInventoryItemSchema } from "@/lib/validations/inventory";
import { uploadAvatar } from "@/lib/cloudinary";

const itemSelect = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  qrCode: true,
  status: true,
  assignedToId: true,
  addedById: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  addedBy: { select: { id: true, firstName: true, lastName: true } },
};

// GET /api/inventory/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({ where: { id }, select: itemSelect });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(item);
}

// PATCH /api/inventory/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Permission: technician can only edit items assigned to them
  if (
    session.user.role === "TECHNICIAN" &&
    item.assignedToId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  const updateData: Record<string, unknown> = {};
  let newImageUrl: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const name = formData.get("name") as string | null;
    const description = formData.get("description") as string | null;
    const status = formData.get("status") as string | null;
    const assignedToId = formData.get("assignedToId") as string | null;

    if (name) updateData.name = name;
    if (description !== null) updateData.description = description;
    if (status) updateData.status = status;
    if (session.user.role === "ADMIN" && assignedToId !== null) {
      updateData.assignedToId = assignedToId === "none" ? null : assignedToId;
    }

    const file = formData.get("image") as File | null;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadAvatar(buffer, file.name);
      newImageUrl = result.url;
      updateData.imageUrl = newImageUrl;
    }
  } else {
    const body = await req.json();
    const result = updateInventoryItemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }
    const data = result.data;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (session.user.role === "ADMIN" && data.assignedToId !== undefined) {
      updateData.assignedToId = data.assignedToId;
    }
  }

  // Detect what changed for history
  const changedFields: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata: any = {};

  if (updateData.name !== undefined && updateData.name !== item.name) {
    changedFields.push("name");
    metadata.name = { from: item.name, to: updateData.name };
  }
  if (updateData.description !== undefined && updateData.description !== item.description) {
    changedFields.push("description");
  }
  if (updateData.status !== undefined && updateData.status !== item.status) {
    changedFields.push("status");
    metadata.status = { from: item.status, to: updateData.status };
  }
  if (updateData.imageUrl !== undefined) {
    changedFields.push("imageUrl");
  }

  const reassigned =
    session.user.role === "ADMIN" &&
    updateData.assignedToId !== undefined &&
    updateData.assignedToId !== item.assignedToId;

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: updateData,
    select: itemSelect,
  });

  // Log history
  if (changedFields.length > 0) {
    const action = changedFields.includes("status") ? "STATUS_CHANGED" : "UPDATED";
    await prisma.inventoryHistory.create({
      data: {
        itemId: id,
        action,
        performedById: session.user.id,
        notes: `Campos modificados: ${changedFields.join(", ")}`,
        metadata,
      },
    });
  }

  if (reassigned) {
    await prisma.inventoryHistory.create({
      data: {
        itemId: id,
        action: "ASSIGNED",
        fromUserId: item.assignedToId,
        toUserId: updateData.assignedToId as string | null ?? undefined,
        performedById: session.user.id,
      },
    });
  }

  return NextResponse.json(updated);
}

// DELETE /api/inventory/[id] — admin only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Log deletion before cascade delete
  await prisma.inventoryHistory.create({
    data: {
      itemId: id,
      action: "DELETED",
      performedById: session.user.id,
      notes: `Ítem "${item.name}" eliminado`,
    },
  });

  await prisma.inventoryItem.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
