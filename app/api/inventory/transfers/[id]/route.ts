import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveTransferRequestSchema } from "@/lib/validations/inventory";
import { createNotification } from "@/lib/notifications";

// PATCH /api/inventory/transfers/[id] — approve or reject (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const result = resolveTransferRequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { status, adminNote } = result.data;

  const transfer = await prisma.transferRequest.findUnique({
    where: { id },
    include: { item: true },
  });
  if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (transfer.status !== "PENDING") {
    return NextResponse.json({ error: "Esta solicitud ya fue resuelta" }, { status: 409 });
  }

  const updated = await prisma.transferRequest.update({
    where: { id },
    data: {
      status,
      adminNote: adminNote ?? null,
      resolvedAt: new Date(),
    },
    select: {
      id: true,
      status: true,
      adminNote: true,
      resolvedAt: true,
      item: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, firstName: true, lastName: true } },
      toUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (status === "APPROVED") {
    // Reassign item
    await prisma.inventoryItem.update({
      where: { id: transfer.itemId },
      data: { assignedToId: transfer.toUserId, status: "IN_USE" },
    });

    // Log transfer history
    await prisma.inventoryHistory.create({
      data: {
        itemId: transfer.itemId,
        action: "TRANSFERRED",
        fromUserId: transfer.item.assignedToId,
        toUserId: transfer.toUserId,
        performedById: session.user.id,
        notes: `Transferencia aprobada`,
      },
    });
  }

  // In-app notifications (non-blocking)
  const isApproved = status === "APPROVED";
  const itemName = updated.item.name;

  // Notify the technician who requested the transfer
  createNotification({
    userId: transfer.requestedById,
    type: isApproved ? "TRANSFER_APPROVED" : "TRANSFER_REJECTED",
    title: isApproved ? "Transferencia aprobada" : "Transferencia rechazada",
    message: isApproved
      ? `Tu solicitud de transferencia del ítem "${itemName}" ha sido aprobada.`
      : `Tu solicitud de transferencia del ítem "${itemName}" ha sido rechazada.`,
    relatedId: transfer.itemId,
  }).catch(() => {});

  // If approved, notify the recipient technician
  if (isApproved) {
    createNotification({
      userId: transfer.toUserId,
      type: "ITEM_ASSIGNED",
      title: "Ítem asignado",
      message: `El ítem "${itemName}" ha sido transferido y asignado a ti.`,
      relatedId: transfer.itemId,
    }).catch(() => {});
  }

  return NextResponse.json(updated);
}
