import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// GET /api/inventory/transfers — transfer history
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId") ?? "";

  const where =
    session.user.role === "ADMIN"
      ? itemId ? { itemId } : {}
      : {
          OR: [
            { requestedById: session.user.id },
            { toUserId: session.user.id },
            { item: { assignedToId: session.user.id } },
          ],
          ...(itemId ? { itemId } : {}),
        };

  const transfers = await prisma.transferRequest.findMany({
    where,
    select: {
      id: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      item: { select: { id: true, name: true, imageUrl: true, status: true } },
      requestedBy: { select: { id: true, firstName: true, lastName: true } },
      toUser: { select: { id: true, firstName: true, lastName: true } },
      toSquad: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(transfers);
}

// POST /api/inventory/transfers — execute transfer immediately (no approval needed)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = body as Record<string, unknown>;
  const itemId = parsed.itemId as string | undefined;
  const toUserId = parsed.toUserId as string | undefined | null;
  const toSquadId = parsed.toSquadId as string | undefined | null;
  const reason = (parsed.reason as string | undefined) ?? "";
  const location = (parsed.location as string | undefined) ?? "";

  if (!itemId) return NextResponse.json({ error: "itemId requerido" }, { status: 400 });
  if (!toUserId && !toSquadId) {
    return NextResponse.json({ error: "Indica técnico o cuadrilla destino" }, { status: 400 });
  }
  if (!reason.trim()) {
    return NextResponse.json({ error: "El motivo es requerido" }, { status: 400 });
  }

  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });

    // Permission: technician can only transfer their directly assigned items
    if (item.assignedToId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo puedes transferir ítems que tienes asignados" }, { status: 403 });
    }

    if (toUserId && toUserId === session.user.id) {
      return NextResponse.json({ error: "No puedes transferirte un ítem a ti mismo" }, { status: 400 });
    }

    const now = new Date();

    // Create transfer record
    const transfer = await prisma.transferRequest.create({
      data: {
        itemId,
        requestedById: session.user.id,
        toUserId: toUserId ?? null,
        toSquadId: toSquadId ?? null,
        status: "APPROVED",
        resolvedAt: now,
        reason,
        location,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        item: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
        toSquad: { select: { id: true, name: true, members: { select: { id: true } } } },
      },
    });

    // Reassign item
    if (toSquadId) {
      await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { squadId: toSquadId, assignedToId: null },
      });
    } else {
      await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { assignedToId: toUserId!, squadId: null },
      });
    }

    // Build history notes
    const destLabel = transfer.toUser
      ? `${transfer.toUser.firstName} ${transfer.toUser.lastName}`
      : `cuadrilla "${transfer.toSquad?.name ?? toSquadId}"`;

    const noteParts = [`Transferido a ${destLabel}`];
    if (location) noteParts.push(`Lugar: ${location}`);
    if (reason) noteParts.push(`Motivo: ${reason}`);

    await prisma.inventoryHistory.create({
      data: {
        itemId,
        action: "TRANSFERRED",
        fromUserId: session.user.id,
        toUserId: toUserId ?? undefined,
        performedById: session.user.id,
        notes: noteParts.join(" · "),
      },
    });

    // Notify recipient(s) (non-blocking)
    if (toUserId) {
      createNotification({
        userId: toUserId,
        type: "ITEM_ASSIGNED",
        title: "Ítem transferido",
        message: `El ítem "${transfer.item.name}" ha sido transferido y asignado a ti.`,
        relatedId: itemId,
      }).catch(() => {});
    } else if (transfer.toSquad?.members) {
      for (const member of transfer.toSquad.members) {
        createNotification({
          userId: member.id,
          type: "ITEM_ASSIGNED",
          title: "Ítem transferido a tu cuadrilla",
          message: `El ítem "${transfer.item.name}" ha sido asignado a la cuadrilla "${transfer.toSquad.name}".`,
          relatedId: itemId,
        }).catch(() => {});
      }
    }

    return NextResponse.json(transfer, { status: 201 });
  } catch (err) {
    console.error("[POST /api/inventory/transfers]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
