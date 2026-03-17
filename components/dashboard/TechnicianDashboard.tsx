"use client";

import { useEffect, useState } from "react";
import { Package, Plane, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { StatsCard } from "./StatsCard";

interface InventoryItem {
  id: string;
  name: string;
  status: string;
  imageUrl: string | null;
  updatedAt: string;
}

interface VacationEntry {
  id: string;
  startDate: string;
  endDate: string;
  workingDaysRequested: number;
}

interface TechData {
  role: "TECHNICIAN";
  assignedItems: InventoryItem[];
  vacationStats: { total: number; used: number; remaining: number };
  upcomingVacations: VacationEntry[];
  pendingVacationsCount: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: "Disponible", color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
  IN_USE: { label: "En uso", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
  IN_REPAIR: { label: "En reparación", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30" },
  DECOMMISSIONED: { label: "Dado de baja", color: "text-red-600 bg-red-50 dark:bg-red-950/30" },
};

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${new Date(start).toLocaleDateString("es-DE", opts)} – ${new Date(end).toLocaleDateString("es-DE", opts)}`;
}

export function TechnicianDashboard() {
  const [data, setData] = useState<TechData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-lg bg-muted" />
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { vacationStats } = data;
  const vacationPct = vacationStats.total > 0
    ? Math.round((vacationStats.used / vacationStats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Mis ítems asignados"
          value={data.assignedItems.length}
          icon={Package}
          description="Ítems bajo mi responsabilidad"
        />
        <StatsCard
          title="Días de vacaciones restantes"
          value={`${vacationStats.remaining}/${vacationStats.total}`}
          icon={Plane}
          description={`${vacationStats.used} días usados este año`}
        />
        <StatsCard
          title="Vacaciones pendientes"
          value={data.pendingVacationsCount}
          icon={Clock}
          iconColor={data.pendingVacationsCount > 0 ? "text-orange-500" : "text-[#1E3A5F]"}
          description="Solicitudes por aprobar"
        />
      </div>

      {/* Vacation progress bar */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex justify-between items-baseline mb-2">
          <h2 className="text-sm font-semibold">Progreso de vacaciones</h2>
          <span className="text-xs text-muted-foreground">{vacationPct}% usado</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[#1E3A5F] transition-all"
            style={{ width: `${vacationPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
          <span>{vacationStats.used} usados</span>
          <span>{vacationStats.remaining} restantes</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Assigned items */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Mis ítems</h2>
            <Link
              href="/inventory"
              className="text-xs text-[#1E3A5F] hover:underline dark:text-blue-400"
            >
              Ver todos
            </Link>
          </div>
          {data.assignedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Sin ítems asignados
            </p>
          ) : (
            <ul className="space-y-2">
              {data.assignedItems.map((item) => {
                const st = STATUS_LABELS[item.status] ?? { label: item.status, color: "" };
                return (
                  <li key={item.id}>
                    <Link
                      href={`/inventory/${item.id}`}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 h-9 w-9 rounded bg-muted overflow-hidden flex items-center justify-center">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.name} width={36} height={36} className="h-9 w-9 object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Upcoming vacations */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Próximas vacaciones</h2>
            <Link
              href="/vacations"
              className="text-xs text-[#1E3A5F] hover:underline dark:text-blue-400"
            >
              Ver todas
            </Link>
          </div>
          {data.upcomingVacations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
              <Plane className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Sin vacaciones próximas aprobadas</p>
              <Link
                href="/vacations"
                className="text-xs text-[#1E3A5F] hover:underline dark:text-blue-400 mt-1"
              >
                Solicitar vacaciones →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.upcomingVacations.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
                >
                  <Plane className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      {formatDateRange(v.startDate, v.endDate)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {v.workingDaysRequested} día{v.workingDaysRequested !== 1 ? "s" : ""} laborable{v.workingDaysRequested !== 1 ? "s" : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Pending vacation requests alert */}
          {data.pendingVacationsCount > 0 && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
              <Plane className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Tienes {data.pendingVacationsCount} solicitud
                {data.pendingVacationsCount !== 1 ? "es" : ""} de vacaciones pendiente
                {data.pendingVacationsCount !== 1 ? "s" : ""} de aprobación
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
