import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSquadMembersSchema } from "@/lib/validations/squad";

// PUT /api/squads/[id]/members — replace full member list (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const squad = await prisma.squad.findUnique({ where: { id } });
  if (!squad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const result = updateSquadMembersSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { memberIds } = result.data;

  try {
    await prisma.$transaction([
      // Remove all current members of this squad
      prisma.user.updateMany({ where: { squadId: id }, data: { squadId: null } }),
      // Assign new members (overwrites any previous squad they were in)
      ...(memberIds.length > 0
        ? [prisma.user.updateMany({ where: { id: { in: memberIds } }, data: { squadId: id } })]
        : []),
    ]);

    const members = await prisma.user.findMany({
      where: { squadId: id },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, isActive: true },
      orderBy: { firstName: "asc" },
    });

    return NextResponse.json(members);
  } catch (err) {
    console.error("[PUT /api/squads/[id]/members]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
