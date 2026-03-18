import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSquadSchema } from "@/lib/validations/squad";

const squadSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  members: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, isActive: true },
    orderBy: { firstName: "asc" as const },
  },
  items: {
    select: { id: true, name: true, status: true, imageUrl: true },
    orderBy: { createdAt: "desc" as const },
  },
  _count: { select: { members: true, items: true } },
};

// GET /api/squads/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const squad = await prisma.squad.findUnique({ where: { id }, select: squadSelect });
  if (!squad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(squad);
}

// PATCH /api/squads/[id] — update name/description/isActive (admin only)
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

  const result = updateSquadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  try {
    const squad = await prisma.squad.update({
      where: { id },
      data: result.data,
      select: squadSelect,
    });
    return NextResponse.json(squad);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe una cuadrilla con ese nombre" }, { status: 409 });
    }
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[PATCH /api/squads/[id]]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE /api/squads/[id] — admin only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    // Remove squadId from all members and items first
    await prisma.$transaction([
      prisma.user.updateMany({ where: { squadId: id }, data: { squadId: null } }),
      prisma.inventoryItem.updateMany({ where: { squadId: id }, data: { squadId: null } }),
      prisma.squad.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[DELETE /api/squads/[id]]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
