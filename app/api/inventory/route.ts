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

  // Technicians only see items assigned to them
  const ownerFilter =
    session.user.role === "TECHNICIAN"
      ? { assignedToId: session.user.id }
      : assignedToId === "unassigned"
      ? { assignedToId: null }
      : assignedToId
      ? { assignedToId }
      : {};

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
      addedById: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
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
  let imageUrl = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    name = (formData.get("name") as string) ?? "";
    description = (formData.get("description") as string) ?? "";
    status = (formData.get("status") as string) ?? "AVAILABLE";
    const rawAssigned = formData.get("assignedToId") as string | null;
    assignedToId = rawAssigned && rawAssigned !== "none" ? rawAssigned : null;

    const file = formData.get("image") as File | null;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadAvatar(buffer, file.name);
      imageUrl = result.url;
    }
  } else {
    const body = await req.json();
    name = body.name;
    description = body.description ?? "";
    status = body.status ?? "AVAILABLE";
    assignedToId = body.assignedToId ?? null;
  }

  const result = createInventoryItemSchema.safeParse({ name, description, status, assignedToId });
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  try {
    // Technician auto-assigns to themselves
    const effectiveAssignedToId =
      session.user.role === "TECHNICIAN" ? session.user.id : assignedToId;

    // Create the item first to get the ID for the QR
    const item = await prisma.inventoryItem.create({
      data: {
        name,
        description,
        imageUrl,
        status: status as "AVAILABLE" | "IN_USE" | "IN_REPAIR" | "DECOMMISSIONED",
        assignedToId: effectiveAssignedToId,
        addedById: session.user.id,
      },
    });

    // Generate QR code pointing to item detail URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const qrDataUrl = await QRCode.toDataURL(`${appUrl}/inventory/${item.id}`, {
      width: 300,
      margin: 2,
    });

    // Update item with QR code
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
        createdAt: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        addedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Log CREATED history
    await prisma.inventoryHistory.create({
      data: {
        itemId: item.id,
        action: "CREATED",
        toUserId: effectiveAssignedToId,
        performedById: session.user.id,
        notes: effectiveAssignedToId ? `Ítem creado y asignado` : "Ítem creado",
      },
    });

    // If assigned, also log ASSIGNED
    if (effectiveAssignedToId) {
      await prisma.inventoryHistory.create({
        data: {
          itemId: item.id,
          action: "ASSIGNED",
          toUserId: effectiveAssignedToId,
          performedById: session.user.id,
        },
      });
    }

    return NextResponse.json(updatedItem, { status: 201 });
  } catch (err) {
    console.error("[POST /api/inventory]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
