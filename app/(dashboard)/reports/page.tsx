import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportsPageClient } from "@/components/reports/ReportsPageClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const technicians = await prisma.user.findMany({
    where: { role: "TECHNICIAN", isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Exporta datos de inventario, vacaciones y actividad en Excel o PDF.
        </p>
      </div>
      <ReportsPageClient technicians={technicians} />
    </div>
  );
}
