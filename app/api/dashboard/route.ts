import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (session.user.role === "ADMIN") {
    const [
      activeUsersCount,
      inventoryByStatus,
      pendingVacationsCount,
      techniciansVacationStats,
      recentActivity,
    ] = await Promise.all([
      // Active technicians count
      prisma.user.count({ where: { isActive: true, role: "TECHNICIAN" } }),

      // Inventory items grouped by status
      prisma.inventoryItem.groupBy({
        by: ["status"],
        _count: { status: true },
      }),

      // Pending vacation requests
      prisma.vacationRequest.count({ where: { status: "PENDING" } }),

      // Technicians with vacation stats (top 5 by remaining days)
      prisma.user.findMany({
        where: { isActive: true, role: "TECHNICIAN" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          vacationDaysTotal: true,
          vacationRequests: {
            where: { status: "APPROVED" },
            select: { workingDaysRequested: true },
          },
        },
        take: 5,
        orderBy: { firstName: "asc" },
      }),

      // Recent inventory activity (last 8 entries)
      prisma.inventoryHistory.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          action: true,
          createdAt: true,
          notes: true,
          item: { select: { id: true, name: true } },
          performedBy: { select: { firstName: true, lastName: true } },
          toUser: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    // Compute remaining vacation days per technician
    const techStats = techniciansVacationStats.map((t) => {
      const usedDays = t.vacationRequests.reduce(
        (sum, r) => sum + r.workingDaysRequested,
        0
      );
      return {
        id: t.id,
        name: `${t.firstName} ${t.lastName}`,
        avatarUrl: t.avatarUrl,
        total: t.vacationDaysTotal,
        used: usedDays,
        remaining: t.vacationDaysTotal - usedDays,
      };
    });

    // Sort by remaining days descending
    techStats.sort((a, b) => b.remaining - a.remaining);

    return NextResponse.json({
      role: "ADMIN",
      activeUsersCount,
      inventoryByStatus: inventoryByStatus.map((i) => ({
        status: i.status,
        count: i._count.status,
      })),
      pendingVacationsCount,
      techStats,
      recentActivity: recentActivity.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  }

  // TECHNICIAN dashboard
  const userId = session.user.id;

  const [
    assignedItems,
    userWithVacations,
    upcomingVacations,
    pendingVacationsCount,
  ] = await Promise.all([
    // Items assigned to this technician
    prisma.inventoryItem.findMany({
      where: { assignedToId: userId },
      select: {
        id: true,
        name: true,
        status: true,
        imageUrl: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),

    // User with approved vacations for stats
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        vacationDaysTotal: true,
        vacationRequests: {
          where: { status: "APPROVED" },
          select: { workingDaysRequested: true },
        },
      },
    }),

    // Upcoming approved vacations
    prisma.vacationRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: "asc" },
      take: 3,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        workingDaysRequested: true,
      },
    }),

    // Pending vacation requests count
    prisma.vacationRequest.count({ where: { userId, status: "PENDING" } }),
  ]);

  const usedDays =
    userWithVacations?.vacationRequests.reduce(
      (sum, r) => sum + r.workingDaysRequested,
      0
    ) ?? 0;
  const totalDays = userWithVacations?.vacationDaysTotal ?? 24;

  return NextResponse.json({
    role: "TECHNICIAN",
    assignedItems: assignedItems.map((i) => ({
      ...i,
      updatedAt: i.updatedAt.toISOString(),
    })),
    vacationStats: {
      total: totalDays,
      used: usedDays,
      remaining: totalDays - usedDays,
    },
    upcomingVacations: upcomingVacations.map((v) => ({
      ...v,
      startDate: v.startDate.toISOString(),
      endDate: v.endDate.toISOString(),
    })),
    pendingVacationsCount,
  });
}
