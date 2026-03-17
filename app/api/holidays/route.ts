import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHolidaySchema } from "@/lib/validations/vacation";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  try {
    // Fetch holidays for a specific user (admin or own)
    if (userId) {
      if (session.user.role !== "ADMIN" && userId !== session.user.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      const userHolidays = await prisma.userHoliday.findMany({
        where: { userId },
        include: { holiday: true },
        orderBy: { holiday: { date: "asc" } },
      });
      return NextResponse.json(
        userHolidays.map((uh) => ({
          id: uh.holiday.id,
          name: uh.holiday.name,
          date: uh.holiday.date.toISOString(),
          state: uh.holiday.state,
        }))
      );
    }

    if (session.user.role === "ADMIN") {
      // Admin: all holidays with assignment info
      const holidays = await prisma.holiday.findMany({
        include: {
          _count: { select: { users: true } },
          users: { select: { userId: true } },
        },
        orderBy: { date: "asc" },
      });
      return NextResponse.json(
        holidays.map((h) => ({
          id: h.id,
          name: h.name,
          date: h.date.toISOString(),
          state: h.state,
          assignedCount: h._count.users,
          assignedUserIds: h.users.map((u) => u.userId),
        }))
      );
    }

    // Technician: own assigned holidays
    const userHolidays = await prisma.userHoliday.findMany({
      where: { userId: session.user.id },
      include: { holiday: true },
      orderBy: { holiday: { date: "asc" } },
    });
    return NextResponse.json(
      userHolidays.map((uh) => ({
        id: uh.holiday.id,
        name: uh.holiday.name,
        date: uh.holiday.date.toISOString(),
        state: uh.holiday.state,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

  const parsed = createHolidaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, date, state } = parsed.data;

  try {
    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: new Date(date),
        state: state || null,
        createdById: session.user.id,
      },
    });
    return NextResponse.json(
      {
        id: holiday.id,
        name: holiday.name,
        date: holiday.date.toISOString(),
        state: holiday.state,
        assignedCount: 0,
        assignedUserIds: [],
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
