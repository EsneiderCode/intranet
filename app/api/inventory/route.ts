import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInventoryItemSchema } from "@/lib/validations/inventory";
import { uploadAvatar } from "@/lib/cloudinary";
import QRCode from "qrcode";

// GET /api/inventory — list items (all authenticated users)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const assignedToId = searchParams.get("assignedToId") ?? "";
  const squadId = searchParams.get("squadId") ?? "";

  let ownerFilter: Record<string, unknown> = {};

  if (session.user.role === "TECHNICIAN") {
    // Technician sees their personal items + their squad's items
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { squadId: true },
    });
    const conditions: Record<string, unknown>[] = [{ assignedToId: session.user.id }];
    if (user?.squadId) conditions.push({ squadId: user.squadId });
    ownerFilter = { OR: conditions };
  } else {
    // Admin filters
    if (assignedToId === "unassigned") {
      ownerFilter = { assignedToId: null, squadId: null };
    } else if (assignedToId) {
      ownerFilter = { assignedToId };
    } else if (squadId) {
      ownerFilter = { squadId };
    }
  }

  const items = await prisma.inventoryItem.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        status ? { status: status as "AVAILABLE" | "IN_USE" | "IN_REPAIR" | "DECOMMISSIONED" } : {},
        ownerFilter,
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      qrCode: true,
      status: true,
      assignedToId: true,
      squadId: true,
      addedById: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
      squad: {
        select: { id: true, name: true },
      },
      addedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

// POST /api/inventory — create item (all authenticated users)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  let name = "";
  let description = "";
  let status = "AVAILABLE";
  let assignedToId: string | null = null;
  let squadId: string | null = null;
  let imageUrl = "";
  const extraImages: File[] = [];
  let isElectronic = false;
  let checklistBrokenParts: boolean | undefined;
  let checklistCase: boolean | undefined;
  let checklistCharger: boolean | undefined;
  let checklistCasePhotoUrl = "";
  let checklistChargerPhotoUrl = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    name = (formData.get("name") as string) ?? "";
    description = (formData.get("description") as string) ?? "";
    status = (formData.get("status") as string) ?? "AVAILABLE";
    const rawAssigned = formData.get("assignedToId") as string | null;
    assignedToId = rawAssigned && rawAssigned !== "none" ? rawAssigned : null;
    const rawSquad = formData.get("squadId") as string | null;
    squadId = rawSquad && rawSquad !== "none" ? rawSquad : null;

    isElectronic = formData.get("isElectronic") === "true";
    const rawBrokenParts = formData.get("checklistBrokenParts") as string | null;
    if (rawBrokenParts !== null) checklistBrokenParts = rawBrokenParts === "true";
    const rawCase = formData.get("checklistCase") as string | null;
    if (rawCase !== null) checklistCase = rawCase === "true";
    const rawCharger = formData.get("checklistCharger") as string | null;
    if (rawCharger !== null) checklistCharger = rawCharger === "true";

    const file = formData.get("image") as File | null;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadAvatar(buffer, file.name);
      imageUrl = result.url;
    }

    // Checklist photos
    const casePhotoFile = formData.get("checklistCasePhoto") as File | null;
    if (casePhotoFile && casePhotoFile.size > 0) {
      const buffer = Buffer.from(await casePhotoFile.arrayBuffer());
      const result = await uploadAvatar(buffer, casePhotoFile.name);
      checklistCasePhotoUrl = result.url;
    }
    const chargerPhotoFile = formData.get("checklistChargerPhoto") as File | null;
    if (chargerPhotoFile && chargerPhotoFile.size > 0) {
      const buffer = Buffer.from(await chargerPhotoFile.arrayBuffer());
      const result = await uploadAvatar(buffer, chargerPhotoFile.name);
      checklistChargerPhotoUrl = result.url;
    }

    // Collect secondary images
    let extraIdx = 0;
    while (true) {
      const extraFile = formData.get(`extraImage_${extraIdx}`) as File | null;
      if (!extraFile || extraFile.size === 0) break;
      extraImages.push(extraFile);
      extraIdx++;
    }
  } else {
    const body = await req.json();
    name = body.name;
    description = body.description ?? "";
    status = body.status ?? "AVAILABLE";
    assignedToId = body.assignedToId ?? null;
    squadId = body.squadId ?? null;
    isElectronic = body.isElectronic ?? false;
    checklistBrokenParts = body.checklistBrokenParts;
    checklistCase = body.checklistCase;
    checklistCharger = body.checklistCharger;
  }

  const result = createInventoryItemSchema.safeParse({
    name, description, status, assignedToId,
    isElectronic, checklistBrokenParts, checklistCase, checklistCharger,
  });
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  try {
    // Technician auto-assigns to themselves (ignore squad)
    let effectiveAssignedToId: string | null = null;
    let effectiveSquadId: string | null = null;

    if (session.user.role === "TECHNICIAN") {
      effectiveAssignedToId = session.user.id;
    } else {
      // Admin: squad takes priority if provided
      if (squadId) {
        effectiveSquadId = squadId;
        effectiveAssignedToId = null;
      } else {
        effectiveAssignedToId = assignedToId;
        effectiveSquadId = null;
      }
    }

    // Create the item first to get the ID for the QR
    const item = await prisma.inventoryItem.create({
      data: {
        name,
        description,
        imageUrl,
        status: status as "AVAILABLE" | "IN_USE" | "IN_REPAIR" | "DECOMMISSIONED",
        assignedToId: effectiveAssignedToId,
        squadId: effectiveSquadId,
        addedById: session.user.id,
        isElectronic,
        checklistBrokenParts: checklistBrokenParts ?? null,
        checklistCase: checklistCase ?? null,
        checklistCasePhotoUrl,
        checklistCharger: checklistCharger ?? null,
        checklistChargerPhotoUrl,
      },
    });

    // Generate QR code
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const qrDataUrl = await QRCode.toDataURL(`${appUrl}/inventory/${item.id}`, {
      width: 300,
      margin: 2,
    });

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { qrCode: qrDataUrl },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        qrCode: true,
        status: true,
        assignedToId: true,
        squadId: true,
        createdAt: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        squad: { select: { id: true, name: true } },
        addedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Upload secondary photos
    if (extraImages.length > 0) {
      const photoData = await Promise.all(
        extraImages.map(async (file, i) => {
          const buffer = Buffer.from(await file.arrayBuffer());
          const result = await uploadAvatar(buffer, file.name);
          return { itemId: item.id, url: result.url, order: i };
        })
      );
      await prisma.inventoryItemPhoto.createMany({ data: photoData });
    }

    // Resolve assignment label for history notes
    let assignedLabel = "";
    if (effectiveAssignedToId) {
      assignedLabel = `técnico (${effectiveAssignedToId})`;
    } else if (effectiveSquadId) {
      const sq = await prisma.squad.findUnique({ where: { id: effectiveSquadId }, select: { name: true } });
      assignedLabel = `cuadrilla "${sq?.name ?? effectiveSquadId}"`;
    }

    // Log CREATED history
    await prisma.inventoryHistory.create({
      data: {
        itemId: item.id,
        action: "CREATED",
        toUserId: effectiveAssignedToId,
        performedById: session.user.id,
        notes: assignedLabel ? `Ítem creado y asignado a ${assignedLabel}` : "Ítem creado",
      },
    });

    // If assigned, also log ASSIGNED
    if (effectiveAssignedToId || effectiveSquadId) {
      await prisma.inventoryHistory.create({
        data: {
          itemId: item.id,
          action: "ASSIGNED",
          toUserId: effectiveAssignedToId,
          performedById: session.user.id,
          notes: effectiveSquadId ? `Asignado a cuadrilla` : undefined,
        },
      });
    }

    return NextResponse.json(updatedItem, { status: 201 });
  } catch (err) {
    console.error("[POST /api/inventory]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
