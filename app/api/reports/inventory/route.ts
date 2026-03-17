import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  IN_USE: "En uso",
  IN_REPAIR: "En reparación",
  DECOMMISSIONED: "Dado de baja",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const assignedToId = searchParams.get("assignedToId") ?? "";
  const search = searchParams.get("search") ?? "";

  const items = await prisma.inventoryItem.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        status ? { status: status as "AVAILABLE" | "IN_USE" | "IN_REPAIR" | "DECOMMISSIONED" } : {},
        assignedToId === "unassigned"
          ? { assignedToId: null }
          : assignedToId
          ? { assignedToId }
          : {},
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      assignedTo: { select: { firstName: true, lastName: true } },
      addedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      status: STATUS_LABELS[item.status] ?? item.status,
      assignedTo: item.assignedTo
        ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}`
        : "Sin asignar",
      addedBy: `${item.addedBy.firstName} ${item.addedBy.lastName}`,
      createdAt: item.createdAt.toLocaleDateString("es-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    }))
  );
}
