import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SquadDetail } from "@/components/squads/SquadDetail";

export const dynamic = "force-dynamic";

export default async function SquadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const { id } = await params;

  const squad = await prisma.squad.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      members: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, isActive: true },
        orderBy: { firstName: "asc" },
      },
      items: {
        select: { id: true, name: true, status: true, imageUrl: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!squad) notFound();

  // Technicians not in any squad (available to add), plus current members
  const availableTechnicians = await prisma.user.findMany({
    where: {
      role: "TECHNICIAN",
      isActive: true,
      OR: [{ squadId: null }, { squadId: id }],
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  return <SquadDetail squad={squad} availableTechnicians={availableTechnicians} />;
}
