import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateVehicleSchema } from "@/lib/validations/vehicle";

const vehicleSelect = {
  id: true,
  name: true,
  plate: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: { id: true, name: true, status: true, imageUrl: true },
    orderBy: { createdAt: "desc" as const },
  },
  _count: { select: { items: true } },
};

// GET /api/vehicles/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id }, select: vehicleSelect });
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(vehicle);
}

// PATCH /api/vehicles/[id] — update name/plate/description/isActive (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const result = updateVehicleSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  try {
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: result.data,
      select: vehicleSelect,
    });
    return NextResponse.json(vehicle);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un vehículo con ese nombre" }, { status: 409 });
    }
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[PATCH /api/vehicles/[id]]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE /api/vehicles/[id] — admin only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    // Remove vehicleId from all items first
    await prisma.$transaction([
      prisma.inventoryItem.updateMany({ where: { vehicleId: id }, data: { vehicleId: null } }),
      prisma.vehicle.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[DELETE /api/vehicles/[id]]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
