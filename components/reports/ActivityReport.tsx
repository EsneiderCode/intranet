"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Row = Record<string, string | number>;

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  technicians: Technician[];
}

const ACTION_OPTIONS = [
  { value: "", label: "Todas las acciones" },
  { value: "CREATED", label: "Creado" },
  { value: "UPDATED", label: "Actualizado" },
  { value: "ASSIGNED", label: "Asignado" },
  { value: "TRANSFERRED", label: "Transferido" },
  { value: "STATUS_CHANGED", label: "Estado cambiado" },
  { value: "DELETED", label: "Eliminado" },
];

const COLUMNS = ["Ítem", "Acción", "Realizado por", "De", "Para", "Notas", "Fecha"];

export function ActivityReport({ technicians }: Props) {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");

  async function fetchData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (userId && userId !== "all") params.set("userId", userId);
    if (action && action !== "all") params.set("action", action);
    const res = await fetch(`/api/reports/activity?${params}`);
    if (res.ok) { setData(await res.json()); setFetched(true); }
    setLoading(false);
  }

  function handleExcel() {
    exportToExcel(data, `actividad_${new Date().toISOString().slice(0, 10)}`, "Actividad");
  }

  function handlePDF() {
    exportToPDF(
      "Reporte de Actividad de Inventario",
      COLUMNS,
      data.map((r) => Object.values(r)),
      `actividad_${new Date().toISOString().slice(0, 10)}`
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Fecha inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Fecha fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="w-52">
          <label className="text-xs text-muted-foreground mb-1 block">Técnico</label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {technicians.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <label className="text-xs text-muted-foreground mb-1 block">Acción</label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((o) => (
                <SelectItem key={o.value || "all"} value={o.value || "all"}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Generar
          </Button>
        </div>
        {fetched && data.length > 0 && (
          <div className="ml-auto flex gap-2 items-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExcel}>
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePDF}>
              <FileText className="h-4 w-4 text-red-600" />
              PDF
            </Button>
          </div>
        )}
      </div>

      {/* Preview table */}
      {fetched && (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Sin datos para los filtros seleccionados</td></tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/40">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className={`px-3 py-2 ${j === 0 ? "font-medium" : "text-muted-foreground"} ${j === 6 ? "whitespace-nowrap" : ""}`}>
                          {val !== null && val !== undefined ? String(val) : ""}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data.length > 0 && (
            <div className="px-3 py-2 bg-muted/50 text-xs text-muted-foreground border-t">
              {data.length} registro{data.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
