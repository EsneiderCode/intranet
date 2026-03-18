import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVacationRequestSchema } from "@/lib/validations/vacation";
import { calculateWorkingDays } from "@/lib/vacations";
import { createNotification } from "@/lib/notifications";
import { sendNewVacationRequestEmail } from "@/lib/email";
import { APP_URL } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (userId && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const targetUserId = userId ?? session.user.id;
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(`${currentYear}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${currentYear}-12-31T23:59:59.999Z`);

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
          vacationDaysPerYear: true,
          vacationDaysCarryOver: true,
          holidays: {
            include: { holiday: true },
          },
        },
      }),
    ]);

    // Stats are calculated only from current-year requests
    const currentYearRequests = requests.filter(
      (r) => r.startDate >= yearStart && r.startDate <= yearEnd
    );

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
            vacationDaysPerYear: user.vacationDaysPerYear,
            vacationDaysCarryOver: user.vacationDaysCarryOver,
            holidays: user.holidays.map((uh) => ({
              id: uh.holiday.id,
              name: uh.holiday.name,
              date: uh.holiday.date.toISOString(),
              states: uh.holiday.states,
            })),
          }
        : null,
      currentYearStats: {
        usedThisYear: currentYearRequests
          .filter((r) => r.status === "APPROVED")
          .reduce((s, r) => s + r.workingDaysRequested, 0),
        pendingThisYear: currentYearRequests
          .filter((r) => r.status === "PENDING")
          .reduce((s, r) => s + r.workingDaysRequested, 0),
      },
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
  const requestYear = start.getUTCFullYear();
  const yearStart = new Date(`${requestYear}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${requestYear}-12-31T23:59:59.999Z`);

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

    // Check remaining days using current-year approved + carry-over
    const [approvedThisYear, user] = await Promise.all([
      prisma.vacationRequest.aggregate({
        where: {
          userId: session.user.id,
          status: "APPROVED",
          startDate: { gte: yearStart, lte: yearEnd },
        },
        _sum: { workingDaysRequested: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { vacationDaysPerYear: true, vacationDaysCarryOver: true },
      }),
    ]);

    const usedThisYear = approvedThisYear._sum.workingDaysRequested ?? 0;
    const perYear = user?.vacationDaysPerYear ?? 24;
    const carryOver = user?.vacationDaysCarryOver ?? 0;
    const remainingThisYear = Math.max(0, perYear - usedThisYear);
    const totalAvailable = remainingThisYear + carryOver;

    if (workingDays > totalAvailable) {
      return NextResponse.json(
        {
          error: `No tienes suficientes días disponibles. Disponibles: ${totalAvailable} (${remainingThisYear} de ${requestYear} + ${carryOver} acumulados), Solicitados: ${workingDays}`,
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

    const [vacationRequest, requester] = await Promise.all([
      prisma.vacationRequest.create({
        data: {
          userId: session.user.id,
          startDate: start,
          endDate: end,
          workingDaysRequested: workingDays,
          status: "PENDING",
          description: description ?? "",
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true },
      }),
    ]);

    // Notify bsandoval@umtelkomd.com (admin) about new vacation request (non-blocking)
    const ADMIN_NOTIFY_EMAIL = "bsandoval@umtelkomd.com";
    Promise.resolve().then(async () => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { email: ADMIN_NOTIFY_EMAIL },
          select: { id: true },
        });
        const techName = requester
          ? `${requester.firstName} ${requester.lastName}`
          : "Un técnico";
        const startStr = start.toLocaleDateString("es-DE", { day: "2-digit", month: "long", year: "numeric" });
        const endStr = end.toLocaleDateString("es-DE", { day: "2-digit", month: "long", year: "numeric" });

        if (adminUser) {
          await createNotification({
            userId: adminUser.id,
            type: "VACATION_REQUESTED",
            title: "Nueva solicitud de vacaciones",
            message: `${techName} ha solicitado vacaciones del ${startStr} al ${endStr} (${workingDays} días laborables).`,
            relatedId: vacationRequest.id,
          });
        }

        await sendNewVacationRequestEmail({
          to: ADMIN_NOTIFY_EMAIL,
          technicianName: techName,
          startDate: startStr,
          endDate: endStr,
          workingDays,
          vacationsUrl: `${APP_URL}/vacations`,
        });
      } catch {
        // Non-blocking — do not fail the request
      }
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
