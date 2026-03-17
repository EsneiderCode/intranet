"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { calculateWorkingDays, getHolidaysInRange } from "@/lib/vacations";
import { cn } from "@/lib/utils";

type Holiday = {
  id: string;
  name: string;
  date: string; // ISO string
};

interface VacationRequestFormProps {
  holidays: Holiday[];
  totalDays: number;
  usedDays: number;
  onSuccess?: () => void;
}

export function VacationRequestForm({
  holidays,
  totalDays,
  usedDays,
  onSuccess,
}: VacationRequestFormProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const remainingDays = totalDays - usedDays;

  // Client-side breakdown calculation
  const breakdown = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Total calendar days
    const totalCalendarDays =
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Holidays assigned to this user that fall in the range
    const normalizedHolidays = holidays.map((h) => ({
      ...h,
      date: h.date.slice(0, 10),
    }));
    const holidaysInRange = getHolidaysInRange(startDate, endDate, normalizedHolidays);

    // Working days (excludes weekends + user's holidays)
    const workingDays = calculateWorkingDays(
      start,
      end,
      holidays.map((h) => new Date(h.date))
    );

    // Weekend count (approximate)
    const weekends = totalCalendarDays - workingDays - holidaysInRange.length;

    const remainingAfter = remainingDays - workingDays;
    const hasWorkingDays = workingDays > 0;
    const enoughDays = workingDays <= remainingDays;

    return {
      totalCalendarDays,
      weekends: Math.max(0, weekends),
      holidaysInRange,
      workingDays,
      remainingAfter,
      hasWorkingDays,
      enoughDays,
    };
  }, [startDate, endDate, holidays, remainingDays]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!breakdown?.hasWorkingDays) {
      setError("El rango seleccionado no contiene días laborables.");
      return;
    }
    if (!breakdown.enoughDays) {
      setError(
        `No tienes suficientes días disponibles. Disponibles: ${remainingDays}, Solicitados: ${breakdown.workingDays}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/vacations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al crear la solicitud");
        return;
      }
      setSuccess(true);
      setStartDate("");
      setEndDate("");
      setDescription("");
      router.refresh();
      onSuccess?.();
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-[#1E3A5F] dark:text-blue-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Nueva solicitud de vacaciones
        </h3>
      </div>

      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50 dark:bg-green-900/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            Solicitud enviada correctamente. El administrador revisará tu petición.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50 dark:bg-red-900/20" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha de inicio</Label>
            <Input
              id="startDate"
              type="date"
              min={todayStr}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate && endDate < e.target.value) setEndDate("");
                setError("");
                setSuccess(false);
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Fecha de fin</Label>
            <Input
              id="endDate"
              type="date"
              min={startDate || todayStr}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setError("");
                setSuccess(false);
              }}
              required
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Descripción / Motivo (opcional)</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Vacaciones familiares, viaje programado..."
            maxLength={500}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Información adicional para el administrador. Máx. 500 caracteres.
          </p>
        </div>

        {/* Breakdown panel */}
        {breakdown && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-[#1E3A5F] dark:text-blue-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Desglose de la solicitud
              </span>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Días en el rango</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {breakdown.totalCalendarDays}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Fines de semana</span>
                <span className="font-medium text-gray-500">− {breakdown.weekends}</span>
              </div>
              {breakdown.holidaysInRange.length > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600 dark:text-gray-400 truncate">
                    Festivos ({breakdown.holidaysInRange.map((h) => h.name).join(", ")})
                  </span>
                  <span className="font-medium text-blue-600 flex-shrink-0">
                    − {breakdown.holidaysInRange.length}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Días laborables solicitados
                </span>
                <span
                  className={cn(
                    "font-bold text-base",
                    breakdown.hasWorkingDays ? "text-[#1E3A5F] dark:text-blue-400" : "text-red-600"
                  )}
                >
                  {breakdown.workingDays}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Días disponibles ahora</span>
                <span className="font-medium">{remainingDays}</span>
              </div>
              <div
                className={cn(
                  "flex justify-between font-semibold",
                  breakdown.enoughDays && breakdown.hasWorkingDays
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                <span>Disponibles tras aprobación</span>
                <span>{breakdown.remainingAfter}</span>
              </div>
            </div>

            {!breakdown.hasWorkingDays && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                El rango seleccionado no incluye días laborables.
              </p>
            )}
            {breakdown.hasWorkingDays && !breakdown.enoughDays && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                No tienes suficientes días disponibles para esta solicitud.
              </p>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !breakdown ||
            !breakdown.hasWorkingDays ||
            !breakdown.enoughDays
          }
          className="w-full bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
        >
          {isSubmitting ? "Enviando..." : "Enviar solicitud"}
        </Button>
      </form>
    </div>
  );
}
