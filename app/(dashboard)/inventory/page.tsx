import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InventoryTable } from "@/components/inventory/InventoryTable";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isTechnician = session.user.role === "TECHNICIAN";
  const isAdmin = session.user.role === "ADMIN";

  // For technicians, get their squad to also show squad items
  const techUser = isTechnician
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { squadId: true },
      })
    : null;

  const [items, technicians, squads] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: isTechnician
        ? {
            OR: [
              { assignedToId: session.user.id },
              ...(techUser?.squadId ? [{ squadId: techUser.squadId }] : []),
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        qrCode: true,
        status: true,
        assignedToId: true,
        squadId: true,
        createdAt: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        squad: {
          select: { id: true, name: true },
        },
        addedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { role: "TECHNICIAN", isActive: true },
          select: { id: true, firstName: true, lastName: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.squad.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const serialized = items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground">
          Gestiona los equipos y herramientas de la empresa.
        </p>
      </div>
      <InventoryTable
        data={serialized}
        isAdmin={isAdmin}
        currentUserId={session.user.id}
        technicians={technicians}
        squads={squads}
      />
    </div>
  );
}
