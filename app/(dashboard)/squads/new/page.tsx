import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SquadForm } from "@/components/squads/SquadForm";

export const dynamic = "force-dynamic";

export default async function NewSquadPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nueva cuadrilla</h1>
        <p className="text-muted-foreground">Crea un nuevo equipo de trabajo.</p>
      </div>
      <SquadForm mode="create" />
    </div>
  );
}
