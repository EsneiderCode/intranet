import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InventoryItemDetail } from "@/components/inventory/InventoryItemDetail";

export const dynamic = "force-dynamic";

export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      qrCode: true,
      status: true,
      assignedToId: true,
      squadId: true,
      addedById: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      squad: { select: { id: true, name: true } },
      addedBy: { select: { id: true, firstName: true, lastName: true } },
      photos: { select: { id: true, url: true, order: true }, orderBy: { order: "asc" } },
      isElectronic: true,
      checklistBrokenParts: true,
      checklistCase: true,
      checklistCasePhotoUrl: true,
      checklistCharger: true,
      checklistChargerPhotoUrl: true,
    },
  });

  if (!item) notFound();

  const isAdmin = session.user.role === "ADMIN";

  const [technicians, squads, transfers] = await Promise.all([
    isAdmin
      ? prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        })
      : prisma.user.findMany({
          where: { isActive: true, id: { not: session.user.id } },
          select: { id: true, firstName: true, lastName: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        }),
    isAdmin
      ? prisma.squad.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : prisma.squad.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
    prisma.transferRequest.findMany({
      where: { itemId: id },
      select: {
        id: true,
        status: true,
        adminNote: true,
        createdAt: true,
        resolvedAt: true,
        item: { select: { id: true, name: true, imageUrl: true, status: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
        toSquad: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const serializedItem = {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };

  const serializedTransfers = transfers.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
  }));

  const canEdit =
    session.user.role === "ADMIN" || item.assignedToId === session.user.id;

  const canTransfer =
    session.user.role === "TECHNICIAN" && item.assignedToId === session.user.id;

  return (
    <InventoryItemDetail
      item={serializedItem}
      isAdmin={isAdmin}
      currentUserId={session.user.id}
      technicians={technicians}
      squads={squads}
      transfers={serializedTransfers}
      canEdit={canEdit}
      canTransfer={canTransfer}
    />
  );
}
