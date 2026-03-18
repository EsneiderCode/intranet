import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Aprobada",
  PENDING: "Pendiente",
  REJECTED: "Rechazada",
};

function fmt(date: Date) {
  return date.toLocaleDateString("es-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "by-technician"; // "by-technician" | "by-period"
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const userId = searchParams.get("userId") ?? "";

  if (type === "by-period") {
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate y endDate son requeridos" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const requests = await prisma.vacationRequest.findMany({
      where: {
        status: "APPROVED",
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
        ...(userId ? { userId } : {}),
      },
      select: {
        startDate: true,
        endDate: true,
        workingDaysRequested: true,
        status: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ user: { firstName: "asc" } }, { startDate: "asc" }],
    });

    return NextResponse.json(
      requests.map((r) => ({
        técnico: `${r.user.firstName} ${r.user.lastName}`,
        fechaInicio: fmt(r.startDate),
        fechaFin: fmt(r.endDate),
        díasLaborables: r.workingDaysRequested,
        estado: STATUS_LABELS[r.status] ?? r.status,
      }))
    );
  }

  // by-technician: vacation stats per technician
  const users = await prisma.user.findMany({
    where: {
      role: "TECHNICIAN",
      isActive: true,
      ...(userId ? { id: userId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      vacationDaysPerYear: true,
      vacationDaysCarryOver: true,
      vacationRequests: {
        select: {
          startDate: true,
          endDate: true,
          workingDaysRequested: true,
          status: true,
          requestedAt: true,
        },
        orderBy: { requestedAt: "desc" },
      },
    },
    orderBy: { firstName: "asc" },
  });

  const rows: Record<string, string | number>[] = [];

  for (const u of users) {
    const usedDays = u.vacationRequests
      .filter((r) => r.status === "APPROVED")
      .reduce((s, r) => s + r.workingDaysRequested, 0);
    const remainingThisYear = Math.max(0, u.vacationDaysPerYear - usedDays);
    const totalAvailable = remainingThisYear + u.vacationDaysCarryOver;

    // Summary row
    rows.push({
      técnico: `${u.firstName} ${u.lastName}`,
      díasAño: u.vacationDaysPerYear,
      díasAcumulados: u.vacationDaysCarryOver,
      díasTotalDisponibles: totalAvailable,
      díasUsados: usedDays,
      díasRestantes: totalAvailable - usedDays,
      solicitudes: u.vacationRequests.length,
      período: "",
      díasSolicitud: "",
      estado: "",
    });

    // Detail rows for each request
    for (const r of u.vacationRequests) {
      rows.push({
        técnico: "",
        díasAño: "",
        díasAcumulados: "",
        díasTotalDisponibles: "",
        díasUsados: "",
        díasRestantes: "",
        solicitudes: "",
        período: `${fmt(r.startDate)} – ${fmt(r.endDate)}`,
        díasSolicitud: r.workingDaysRequested,
        estado: STATUS_LABELS[r.status] ?? r.status,
      });
    }
  }

  return NextResponse.json(rows);
}
