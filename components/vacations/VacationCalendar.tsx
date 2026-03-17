"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarVacation = {
  id: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export type CalendarHoliday = {
  id: string;
  name: string;
  date: string; // ISO string
};

interface VacationCalendarProps {
  vacations: CalendarVacation[];
  holidays: CalendarHoliday[];
}

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Monday-first offset (0=Mon, 6=Sun)
function getFirstDayOffset(year: number, month: number): number {
  const day = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function VacationCalendar({ vacations, holidays }: VacationCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth());

  const todayStr = today.toISOString().slice(0, 10);

  // Pre-compute lookup structures
  const { approvedDates, pendingDates, holidayMap } = useMemo(() => {
    const approved = new Set<string>();
    const pending = new Set<string>();
    const hMap = new Map<string, string>(); // dateStr -> holiday name

    vacations.forEach((v) => {
      if (v.status === "REJECTED") return;
      const current = new Date(v.startDate);
      const end = new Date(v.endDate);
      while (current <= end) {
        const str = current.toISOString().slice(0, 10);
        if (v.status === "APPROVED") approved.add(str);
        else if (v.status === "PENDING") pending.add(str);
        current.setUTCDate(current.getUTCDate() + 1);
      }
    });

    holidays.forEach((h) => {
      hMap.set(h.date.slice(0, 10), h.name);
    });

    return { approvedDates: approved, pendingDates: pending, holidayMap: hMap };
  }, [vacations, holidays]);

  const offset = getFirstDayOffset(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  // Build grid cells: null = empty, number = day of month
  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < offset; i++) {
    cells.push({ day: null, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push({ day: d, dateStr: `${year}-${mm}-${dd}` });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, dateStr: null });
  }

  function getDayClasses(dateStr: string | null): string {
    if (!dateStr) return "invisible";
    const dayOfWeek = new Date(dateStr + "T00:00:00Z").getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isToday = dateStr === todayStr;
    const isHoliday = holidayMap.has(dateStr);
    const isApproved = approvedDates.has(dateStr);
    const isPending = pendingDates.has(dateStr);

    return cn(
      "flex items-center justify-center rounded-md text-xs font-medium h-8 w-full transition-colors",
      isHoliday && "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
      !isHoliday && isApproved && "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
      !isHoliday && !isApproved && isPending && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
      !isHoliday && !isApproved && !isPending && isWeekend && "text-gray-400 dark:text-gray-600",
      !isHoliday && !isApproved && !isPending && !isWeekend && "text-gray-700 dark:text-gray-300",
      isToday && "ring-2 ring-[#1E3A5F] ring-offset-1 dark:ring-blue-400"
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
          {MONTHS_ES[month]} {year}
        </h3>
        <Button variant="ghost" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              "text-center text-xs font-medium py-1",
              i >= 5 ? "text-gray-400 dark:text-gray-600" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, idx) => (
          <div
            key={idx}
            className={getDayClasses(cell.dateStr)}
            title={
              cell.dateStr && holidayMap.has(cell.dateStr)
                ? holidayMap.get(cell.dateStr)
                : undefined
            }
          >
            {cell.day}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs border-t border-gray-100 dark:border-gray-700 pt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-300 dark:bg-green-900/40" />
          <span className="text-gray-600 dark:text-gray-400">Aprobadas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 dark:bg-yellow-900/40" />
          <span className="text-gray-600 dark:text-gray-400">Pendientes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300 dark:bg-blue-900/40" />
          <span className="text-gray-600 dark:text-gray-400">Festivos</span>
        </div>
      </div>

      {/* Holidays in current month */}
      {(() => {
        const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
        const monthHolidays = holidays.filter((h) =>
          h.date.slice(0, 7) === monthPrefix
        );
        if (monthHolidays.length === 0) return null;
        return (
          <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Festivos este mes
            </p>
            {monthHolidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-blue-700 dark:text-blue-300 font-medium">{h.name}</span>
                </span>
                <span className="text-gray-400 dark:text-gray-500 tabular-nums">
                  {new Date(h.date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  })}
                </span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
