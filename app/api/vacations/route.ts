import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVacationRequestSchema } from "@/lib/validations/vacation";
import { calculateWorkingDays } from "@/lib/vacations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (userId && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const targetUserId = userId ?? session.user.id;

  try {
    const [requests, user] = await Promise.all([
      prisma.vacationRequest.findMany({
        where: { userId: targetUserId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          resolvedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { requestedAt: "desc" },
      }),
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          vacationDaysTotal: true,
          holidays: {
            include: { holiday: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      requests: requests.map((r) => ({
        ...r,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        requestedAt: r.requestedAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
      })),
      user: user
        ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            vacationDaysTotal: user.vacationDaysTotal,
            holidays: user.holidays.map((uh) => ({
              id: uh.holiday.id,
              name: uh.holiday.name,
              date: uh.holiday.date.toISOString(),
              state: uh.holiday.state,
            })),
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createVacationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { startDate, endDate, description } = parsed.data;
  const start = new Date(startDate);
  const end = new Date(endDate);

  try {
    // Fetch user's assigned holidays
    const userHolidays = await prisma.userHoliday.findMany({
      where: { userId: session.user.id },
      include: { holiday: true },
    });
    const holidayDates = userHolidays.map((uh) => uh.holiday.date);

    // Calculate working days excluding weekends and user's holidays
    const workingDays = calculateWorkingDays(start, end, holidayDates);
    if (workingDays <= 0) {
      return NextResponse.json(
        { error: "El rango seleccionado no contiene días laborables" },
        { status: 400 }
      );
    }

    // Check remaining days (only approved count against the total)
    const [approvedRequests, user] = await Promise.all([
      prisma.vacationRequest.findMany({
        where: { userId: session.user.id, status: "APPROVED" },
        select: { workingDaysRequested: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { vacationDaysTotal: true },
      }),
    ]);
    const usedDays = approvedRequests.reduce((s, r) => s + r.workingDaysRequested, 0);
    const remaining = (user?.vacationDaysTotal ?? 24) - usedDays;

    if (workingDays > remaining) {
      return NextResponse.json(
        {
          error: `No tienes suficientes días disponibles. Disponibles: ${remaining}, Solicitados: ${workingDays}`,
        },
        { status: 400 }
      );
    }

    // Check for overlapping PENDING or APPROVED requests
    const overlapping = await prisma.vacationRequest.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlapping) {
      return NextResponse.json(
        { error: "Ya tienes una solicitud que se solapa con estas fechas" },
        { status: 400 }
      );
    }

    const vacationRequest = await prisma.vacationRequest.create({
      data: {
        userId: session.user.id,
        startDate: start,
        endDate: end,
        workingDaysRequested: workingDays,
        status: "PENDING",
        description: description ?? "",
      },
    });

    return NextResponse.json(
      {
        ...vacationRequest,
        startDate: vacationRequest.startDate.toISOString(),
        endDate: vacationRequest.endDate.toISOString(),
        requestedAt: vacationRequest.requestedAt.toISOString(),
        resolvedAt: null,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
