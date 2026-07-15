import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VehicleTable } from "@/components/vehicles/VehicleTable";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true,
      name: true,
      plate: true,
      description: true,
      isActive: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
    orderBy: { name: "asc" },
  });

  const serialized = vehicles.map((v) => ({
    ...v,
    createdAt: v.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vehículos</h1>
        <p className="text-muted-foreground">
          Gestiona los vehículos de la empresa y los ítems que llevan.
        </p>
      </div>
      <VehicleTable data={serialized} />
    </div>
  );
}
