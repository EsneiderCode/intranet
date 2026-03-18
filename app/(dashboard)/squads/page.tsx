import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SquadTable } from "@/components/squads/SquadTable";

export const dynamic = "force-dynamic";

export default async function SquadsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const squads = await prisma.squad.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      _count: { select: { members: true, items: true } },
    },
    orderBy: { name: "asc" },
  });

  const serialized = squads.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cuadrillas</h1>
        <p className="text-muted-foreground">
          Gestiona los equipos de trabajo y su asignación de ítems.
        </p>
      </div>
      <SquadTable data={serialized} />
    </div>
  );
}
