import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  holidayId: z.string().min(1),
  userIds: z.array(z.string()),
});

// Replace all user assignments for a holiday with the provided list
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { holidayId, userIds } = parsed.data;

  try {
    await prisma.$transaction([
      // Remove all existing assignments for this holiday
      prisma.userHoliday.deleteMany({ where: { holidayId } }),
      // Create new assignments (assignedById = admin who made the manual change)
      ...userIds.map((userId) =>
        prisma.userHoliday.create({
          data: { userId, holidayId, assignedById: session.user.id },
        })
      ),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
