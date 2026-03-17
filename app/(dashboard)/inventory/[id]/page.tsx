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
      addedById: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      addedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!item) notFound();

  // Technicians list for edit form and transfer
  const technicians =
    session.user.role === "ADMIN"
      ? await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        })
      : await prisma.user.findMany({
          where: {
            isActive: true,
            id: { not: session.user.id },
          },
          select: { id: true, firstName: true, lastName: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        });

  // Pending transfers for this item
  const transfers = await prisma.transferRequest.findMany({
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
    },
    orderBy: { createdAt: "desc" },
  });

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
      isAdmin={session.user.role === "ADMIN"}
      currentUserId={session.user.id}
      technicians={technicians}
      transfers={serializedTransfers}
      canEdit={canEdit}
      canTransfer={canTransfer}
    />
  );
}
