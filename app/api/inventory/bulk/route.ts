import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bulkAssignSchema } from "@/lib/validations/inventory";

// POST /api/inventory/bulk — bulk (re)assign items (admin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const result = bulkAssignSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { itemIds, target } = result.data;

  try {
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, assignedToId: true },
    });
    if (items.length === 0) {
      return NextResponse.json({ error: "No se encontraron los ítems" }, { status: 404 });
    }

    // Resolve target label and update data
    let updateData: {
      assignedToId: string | null;
      squadId: string | null;
      vehicleId: string | null;
      location: string;
    };
    let notes: string;
    let toUserId: string | null = null;
    let action: "ASSIGNED" | "UNASSIGNED" = "ASSIGNED";

    switch (target.type) {
      case "technician": {
        const user = await prisma.user.findUnique({
          where: { id: target.id },
          select: { firstName: true, lastName: true },
        });
        if (!user) return NextResponse.json({ error: "Técnico no encontrado" }, { status: 404 });
        updateData = { assignedToId: target.id, squadId: null, vehicleId: null, location: "" };
        notes = `Asignación masiva a ${user.firstName} ${user.lastName}`;
        toUserId = target.id;
        break;
      }
      case "squad": {
        const squad = await prisma.squad.findUnique({
          where: { id: target.id },
          select: { name: true },
        });
        if (!squad) return NextResponse.json({ error: "Cuadrilla no encontrada" }, { status: 404 });
        updateData = { assignedToId: null, squadId: target.id, vehicleId: null, location: "" };
        notes = `Asignación masiva a cuadrilla "${squad.name}"`;
        break;
      }
      case "vehicle": {
        const vehicle = await prisma.vehicle.findUnique({
          where: { id: target.id },
          select: { name: true },
        });
        if (!vehicle) return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
        updateData = { assignedToId: null, squadId: null, vehicleId: target.id, location: "" };
        notes = `Asignación masiva a vehículo "${vehicle.name}"`;
        break;
      }
      case "location": {
        const location = target.location.trim();
        updateData = { assignedToId: null, squadId: null, vehicleId: null, location };
        notes = `Asignación masiva a ubicación "${location}"`;
        break;
      }
      case "unassign": {
        updateData = { assignedToId: null, squadId: null, vehicleId: null, location: "" };
        notes = "Desasignación masiva";
        action = "UNASSIGNED";
        break;
      }
    }

    const foundIds = items.map((i) => i.id);

    await prisma.$transaction([
      prisma.inventoryItem.updateMany({
        where: { id: { in: foundIds } },
        data: updateData,
      }),
      prisma.inventoryHistory.createMany({
        data: items.map((item) => ({
          itemId: item.id,
          action,
          fromUserId: item.assignedToId,
          toUserId,
          performedById: session.user.id,
          notes,
        })),
      }),
    ]);

    return NextResponse.json({ success: true, updated: foundIds.length });
  } catch (err) {
    console.error("[POST /api/inventory/bulk]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
