import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { VehicleForm } from "@/components/vehicles/VehicleForm";
import { ItemStatusBadge } from "@/components/inventory/ItemStatusBadge";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const { id } = await params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      plate: true,
      description: true,
      isActive: true,
      items: {
        select: { id: true, name: true, status: true, imageUrl: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!vehicle) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{vehicle.name}</h1>
        <p className="text-muted-foreground">Edita el vehículo y consulta los ítems que lleva.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <VehicleForm
          mode="edit"
          initialData={{
            id: vehicle.id,
            name: vehicle.name,
            plate: vehicle.plate,
            description: vehicle.description,
            isActive: vehicle.isActive,
          }}
        />

        <div className="space-y-3">
          <p className="text-sm font-semibold">Ítems en este vehículo ({vehicle.items.length})</p>
          {vehicle.items.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Este vehículo no tiene ítems asignados.</p>
            </div>
          ) : (
            <div className="rounded-lg border divide-y">
              {vehicle.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/inventory/${item.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-md overflow-hidden bg-muted flex-shrink-0 relative">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                        {item.name[0]}
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-sm flex-1">{item.name}</p>
                  <ItemStatusBadge status={item.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
