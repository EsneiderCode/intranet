import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Creado",
  UPDATED: "Actualizado",
  ASSIGNED: "Asignado",
  TRANSFERRED: "Transferido",
  STATUS_CHANGED: "Estado cambiado",
  DELETED: "Eliminado",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const userId = searchParams.get("userId") ?? "";
  const action = searchParams.get("action") ?? "";

  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? (() => { const d = new Date(endDate); d.setHours(23,59,59,999); return d; })() : undefined;

  const entries = await prisma.inventoryHistory.findMany({
    where: {
      ...(start || end
        ? {
            createdAt: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {}),
            },
          }
        : {}),
      ...(userId ? { performedById: userId } : {}),
      ...(action ? { action: action as "CREATED" | "UPDATED" | "ASSIGNED" | "TRANSFERRED" | "STATUS_CHANGED" | "DELETED" } : {}),
    },
    select: {
      action: true,
      createdAt: true,
      notes: true,
      item: { select: { name: true } },
      performedBy: { select: { firstName: true, lastName: true } },
      fromUser: { select: { firstName: true, lastName: true } },
      toUser: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  return NextResponse.json(
    entries.map((e) => ({
      ítem: e.item.name,
      acción: ACTION_LABELS[e.action] ?? e.action,
      realizadoPor: `${e.performedBy.firstName} ${e.performedBy.lastName}`,
      de: e.fromUser ? `${e.fromUser.firstName} ${e.fromUser.lastName}` : "",
      para: e.toUser ? `${e.toUser.firstName} ${e.toUser.lastName}` : "",
      notas: e.notes ?? "",
      fecha: e.createdAt.toLocaleDateString("es-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }))
  );
}
