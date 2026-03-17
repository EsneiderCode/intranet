"use client";

import { useEffect, useState } from "react";
import { Users, Package, Plane } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { StatsCard } from "./StatsCard";
import { InventoryDonutChart } from "./InventoryDonutChart";
import { ActivityFeed } from "./ActivityFeed";

interface TechStat {
  id: string;
  name: string;
  avatarUrl: string | null;
  total: number;
  used: number;
  remaining: number;
}

interface AdminData {
  role: "ADMIN";
  activeUsersCount: number;
  inventoryByStatus: { status: string; count: number }[];
  pendingVacationsCount: number;
  techStats: TechStat[];
  recentActivity: {
    id: string;
    action: string;
    createdAt: string;
    notes: string | null;
    item: { id: string; name: string };
    performedBy: { firstName: string; lastName: string };
    toUser: { firstName: string; lastName: string } | null;
  }[];
}

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase();
}

export function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const totalInventory = data?.inventoryByStatus.reduce((s, i) => s + i.count, 0) ?? 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 rounded-lg bg-muted" />
          <div className="h-72 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Técnicos activos"
          value={data.activeUsersCount}
          icon={Users}
          description="Usuarios con rol técnico"
        />
        <StatsCard
          title="Ítems en inventario"
          value={totalInventory}
          icon={Package}
          description="Total de ítems registrados"
        />
        <Link href="/vacations" className="block">
          <StatsCard
            title="Vacaciones pendientes"
            value={data.pendingVacationsCount}
            icon={Plane}
            iconColor={data.pendingVacationsCount > 0 ? "text-orange-500" : "text-[#1E3A5F]"}
            description="Solicitudes por aprobar"
          />
        </Link>
      </div>

      {/* Charts + Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Inventory donut */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Inventario por estado</h2>
          <InventoryDonutChart data={data.inventoryByStatus} />
        </div>

        {/* Recent activity */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Actividad reciente</h2>
          <ActivityFeed activities={data.recentActivity} />
        </div>
      </div>

      {/* Vacation stats per technician */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Días de vacaciones por técnico</h2>
        {data.techStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin técnicos registrados</p>
        ) : (
          <ul className="space-y-3">
            {data.techStats.map((t) => (
              <li key={t.id} className="flex items-center gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#1E3A5F] flex items-center justify-center overflow-hidden">
                  {t.avatarUrl ? (
                    <Image src={t.avatarUrl} alt={t.name} width={32} height={32} className="h-8 w-8 object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-white">{getInitials(t.name)}</span>
                  )}
                </div>
                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium truncate">{t.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {t.remaining}/{t.total} días
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1E3A5F] transition-all"
                      style={{ width: `${Math.max(0, (t.remaining / t.total) * 100)}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
