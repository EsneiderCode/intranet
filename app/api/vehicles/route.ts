import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVehicleSchema } from "@/lib/validations/vehicle";

// GET /api/vehicles — list all vehicles (admin only)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true,
      name: true,
      plate: true,
      description: true,
      isActive: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(vehicles);
}

// POST /api/vehicles — create vehicle (admin only)
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

  const result = createVehicleSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { name, plate, description } = result.data;

  try {
    const vehicle = await prisma.vehicle.create({
      data: { name, plate, description, createdById: session.user.id },
      select: {
        id: true,
        name: true,
        plate: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    });
    return NextResponse.json(vehicle, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un vehículo con ese nombre" }, { status: 409 });
    }
    console.error("[POST /api/vehicles]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
