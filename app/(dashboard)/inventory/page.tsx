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

  const [items, technicians] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: isTechnician ? { assignedToId: session.user.id } : undefined,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        qrCode: true,
        status: true,
        assignedToId: true,
        createdAt: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
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
      />
    </div>
  );
}
