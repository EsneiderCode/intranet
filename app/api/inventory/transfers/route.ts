import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { uploadAvatar } from "@/lib/cloudinary";

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

  const formData = await req.formData();
  const itemId = formData.get("itemId") as string | null;
  const toUserId = formData.get("toUserId") as string | null;
  const toSquadId = formData.get("toSquadId") as string | null;
  const reason = (formData.get("reason") as string | null) ?? "";
  const location = (formData.get("location") as string | null) ?? "";

  // Checklist fields
  const checklistBrokenPartsRaw = formData.get("checklistBrokenParts") as string | null;
  const checklistCaseRaw = formData.get("checklistCase") as string | null;
  const checklistChargerRaw = formData.get("checklistCharger") as string | null;
  const casePhotoFile = formData.get("checklistCasePhoto") as File | null;
  const chargerPhotoFile = formData.get("checklistChargerPhoto") as File | null;

  const checklistBrokenParts = checklistBrokenPartsRaw === "true" ? true : checklistBrokenPartsRaw === "false" ? false : null;
  const checklistCase = checklistCaseRaw === "true" ? true : checklistCaseRaw === "false" ? false : null;
  const checklistCharger = checklistChargerRaw === "true" ? true : checklistChargerRaw === "false" ? false : null;

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

    // Upload checklist photos if provided
    let casePhotoUrl: string | undefined;
    let chargerPhotoUrl: string | undefined;
    if (casePhotoFile && casePhotoFile.size > 0) {
      const buffer = Buffer.from(await casePhotoFile.arrayBuffer());
      const result = await uploadAvatar(buffer, casePhotoFile.name);
      casePhotoUrl = result.url;
    }
    if (chargerPhotoFile && chargerPhotoFile.size > 0) {
      const buffer = Buffer.from(await chargerPhotoFile.arrayBuffer());
      const result = await uploadAvatar(buffer, chargerPhotoFile.name);
      chargerPhotoUrl = result.url;
    }

    // Reassign item and update checklist
    const checklistUpdate = {
      ...(checklistBrokenParts !== null && { checklistBrokenParts }),
      ...(checklistCase !== null && { checklistCase }),
      ...(checklistCharger !== null && { checklistCharger }),
      ...(casePhotoUrl !== undefined && { checklistCasePhotoUrl: casePhotoUrl }),
      ...(chargerPhotoUrl !== undefined && { checklistChargerPhotoUrl: chargerPhotoUrl }),
    };

    if (toSquadId) {
      await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { squadId: toSquadId, assignedToId: null, ...checklistUpdate },
      });
    } else {
      await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { assignedToId: toUserId!, squadId: null, ...checklistUpdate },
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
