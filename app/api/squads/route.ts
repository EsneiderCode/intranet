import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSquadSchema } from "@/lib/validations/squad";

// GET /api/squads — list all squads (admin only)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const squads = await prisma.squad.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      _count: { select: { members: true, items: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(squads);
}

// POST /api/squads — create squad (admin only)
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

  const result = createSquadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { name, description } = result.data;

  try {
    const squad = await prisma.squad.create({
      data: { name, description, createdById: session.user.id },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: { select: { members: true, items: true } },
      },
    });
    return NextResponse.json(squad, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe una cuadrilla con ese nombre" }, { status: 409 });
    }
    console.error("[POST /api/squads]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
