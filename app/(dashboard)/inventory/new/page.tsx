import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InventoryForm } from "@/components/inventory/InventoryForm";

export const dynamic = "force-dynamic";

export default async function NewInventoryItemPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  const [technicians, squads] = await Promise.all([
    isAdmin
      ? prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo ítem</h1>
        <p className="text-muted-foreground">Agrega un nuevo ítem al inventario.</p>
      </div>
      <InventoryForm
        mode="create"
        isAdmin={isAdmin}
        currentUserId={session.user.id}
        technicians={technicians}
        squads={squads}
      />
    </div>
  );
}
