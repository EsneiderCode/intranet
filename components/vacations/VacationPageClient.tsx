"use client";

import { useState, useEffect, useCallback } from "react";
import { Sun, Clock, CalendarDays, TrendingDown, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { VacationCalendar } from "./VacationCalendar";
import { VacationRequestForm } from "./VacationRequestForm";
import { VacationList, type VacationRequestItem } from "./VacationList";
import { HolidayManagement, type HolidayItem, type TechnicianOption } from "./HolidayManagement";
import { calcVacationStats } from "@/lib/vacations";
import { cn } from "@/lib/utils";

// ─── Shared types ─────────────────────────────────────────────────────────────

type Holiday = {
  id: string;
  name: string;
  date: string;
  state: string | null;
};

type UserData = {
  id: string;
  firstName: string;
  lastName: string;
  vacationDaysTotal: number;
  holidays: Holiday[];
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface VacationPageClientProps {
  role: "ADMIN" | "TECHNICIAN";
  // Technician view
  initialRequests?: VacationRequestItem[];
  initialUser?: UserData;
  // Admin view
  adminAllRequests?: VacationRequestItem[];
  adminAllUsers?: TechnicianOption[];
  adminAllHolidays?: HolidayItem[];
}

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatsBar({
  total,
  used,
  pending,
  remaining,
}: {
  total: number;
  used: number;
  pending: number;
  remaining: number;
}) {
  const stats = [
    { label: "Total días", value: total, icon: Sun, color: "text-[#1E3A5F] dark:text-blue-400" },
    { label: "Usados", value: used, icon: CalendarDays, color: "text-green-600 dark:text-green-400" },
    { label: "Pendientes", value: pending, icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
    {
      label: "Disponibles",
      value: remaining,
      icon: TrendingDown,
      color: remaining > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-1"
        >
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", color)} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
          </div>
          <span className={cn("text-2xl font-bold", color)}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Tab navigation ───────────────────────────────────────────────────────────

type AdminTab = "requests" | "calendar" | "holidays";

// ─── Component ────────────────────────────────────────────────────────────────

export function VacationPageClient({
  role,
  initialRequests = [],
  initialUser,
  adminAllRequests = [],
  adminAllUsers = [],
  adminAllHolidays = [],
}: VacationPageClientProps) {
  // Technician view state
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Admin view state
  const [activeTab, setActiveTab] = useState<AdminTab>("requests");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserData, setSelectedUserData] = useState<{
    requests: VacationRequestItem[];
    user: UserData | null;
  } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [adminRequestFilter, setAdminRequestFilter] = useState<string>("ALL");

  // Fetch selected user data for admin calendar view
  const fetchUserData = useCallback(async (userId: string) => {
    if (!userId) {
      setSelectedUserData(null);
      return;
    }
    setIsLoadingUser(true);
    try {
      const res = await fetch(`/api/vacations?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUserData(data);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) fetchUserData(selectedUserId);
    else setSelectedUserData(null);
  }, [selectedUserId, fetchUserData]);

  // ── TECHNICIAN VIEW ──────────────────────────────────────────────────────────
  if (role === "TECHNICIAN" && initialUser) {
    const stats = calcVacationStats(initialRequests, initialUser.vacationDaysTotal);
    const calendarHolidays = initialUser.holidays.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date,
    }));

    return (
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis vacaciones</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona tus solicitudes de vacaciones y consulta tu calendario.
          </p>
        </div>

        {/* Stats */}
        <StatsBar
          total={stats.total}
          used={stats.used}
          pending={stats.pending}
          remaining={stats.remaining}
        />

        {/* Calendar + request form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VacationCalendar vacations={initialRequests} holidays={calendarHolidays} />

          <div className="space-y-4">
            {!showRequestForm ? (
              <div className="flex flex-col gap-3">
                <Button
                  className="w-full bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                  onClick={() => setShowRequestForm(true)}
                  disabled={stats.remaining <= 0}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {stats.remaining > 0
                    ? "Solicitar vacaciones"
                    : "Sin días disponibles"}
                </Button>
                {initialUser.holidays.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-3">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                      Tus festivos asignados
                    </p>
                    <ul className="space-y-0.5">
                      {initialUser.holidays.map((h) => (
                        <li key={h.id} className="text-xs text-blue-600 dark:text-blue-400 flex justify-between">
                          <span>{h.name}</span>
                          <span className="text-blue-400">
                            {new Date(h.date).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                              timeZone: "UTC",
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <VacationRequestForm
                  holidays={initialUser.holidays}
                  totalDays={stats.total}
                  usedDays={stats.used}
                  onSuccess={() => setShowRequestForm(false)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRequestForm(false)}
                  className="w-full text-gray-500"
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* My requests */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Mis solicitudes</h3>
          <VacationList requests={initialRequests} isAdmin={false} />
        </div>
      </div>
    );
  }

  // ── ADMIN VIEW ───────────────────────────────────────────────────────────────
  const filteredAdminRequests =
    adminRequestFilter === "ALL"
      ? adminAllRequests
      : adminAllRequests.filter((r) => r.status === adminRequestFilter);

  const pendingCount = adminAllRequests.filter((r) => r.status === "PENDING").length;

  // Selected user data for calendar tab
  const viewUser = selectedUserData?.user ?? null;
  const viewRequests = selectedUserData?.requests ?? [];
  const viewStats = viewUser
    ? calcVacationStats(viewRequests, viewUser.vacationDaysTotal)
    : null;

  const tabs: { id: AdminTab; label: string; badge?: number }[] = [
    { id: "requests", label: "Solicitudes", badge: pendingCount > 0 ? pendingCount : undefined },
    { id: "calendar", label: "Calendario" },
    { id: "holidays", label: "Festivos" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vacaciones</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestiona las solicitudes, calendarios y festivos del equipo.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
              activeTab === tab.id
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className="bg-[#F97316] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Solicitudes ── */}
      {activeTab === "requests" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Todas las solicitudes
            </h3>
            <Select value={adminRequestFilter} onValueChange={setAdminRequestFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="PENDING">Pendientes</SelectItem>
                <SelectItem value="APPROVED">Aprobadas</SelectItem>
                <SelectItem value="REJECTED">Rechazadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <VacationList
            requests={filteredAdminRequests}
            isAdmin
            showUserName
          />
        </div>
      )}

      {/* ── Tab: Calendario ── */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          {/* User selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecciona un técnico..." />
              </SelectTrigger>
              <SelectContent>
                {adminAllUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedUserId && (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
              Selecciona un técnico para ver su calendario de vacaciones.
            </div>
          )}

          {isLoadingUser && (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
              Cargando...
            </div>
          )}

          {!isLoadingUser && selectedUserId && viewUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {viewUser.firstName} {viewUser.lastName}
                </h3>
              </div>

              {viewStats && (
                <StatsBar
                  total={viewStats.total}
                  used={viewStats.used}
                  pending={viewStats.pending}
                  remaining={viewStats.remaining}
                />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VacationCalendar
                  vacations={viewRequests}
                  holidays={viewUser.holidays.map((h) => ({
                    id: h.id,
                    name: h.name,
                    date: h.date,
                  }))}
                />
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
                    Solicitudes
                  </h4>
                  <VacationList requests={viewRequests} isAdmin showUserName={false} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Festivos ── */}
      {activeTab === "holidays" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <HolidayManagement holidays={adminAllHolidays} technicians={adminAllUsers} />
        </div>
      )}
    </div>
  );
}
