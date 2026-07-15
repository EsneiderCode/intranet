import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VehicleForm } from "@/components/vehicles/VehicleForm";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo vehículo</h1>
        <p className="text-muted-foreground">Registra un vehículo de la empresa.</p>
      </div>
      <VehicleForm mode="create" />
    </div>
  );
}
