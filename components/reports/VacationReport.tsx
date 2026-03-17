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

type ReportType = "by-technician" | "by-period";
type Row = Record<string, string | number>;

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  technicians: Technician[];
}

export function VacationReport({ technicians }: Props) {
  const [reportType, setReportType] = useState<ReportType>("by-technician");
  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState("");

  async function fetchData() {
    if (reportType === "by-period" && (!startDate || !endDate)) {
      setError("Selecciona fecha inicio y fin");
      return;
    }
    setError("");
    setLoading(true);
    const params = new URLSearchParams({ type: reportType });
    if (userId && userId !== "all") params.set("userId", userId);
    if (reportType === "by-period") {
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    }
    const res = await fetch(`/api/reports/vacations?${params}`);
    if (res.ok) { setData(await res.json()); setFetched(true); }
    setLoading(false);
  }

  const columns = reportType === "by-technician"
    ? ["Técnico", "Total", "Usados", "Restantes", "Solicitudes", "Período", "Días", "Estado"]
    : ["Técnico", "Fecha inicio", "Fecha fin", "Días laborables", "Estado"];

  function handleExcel() {
    exportToExcel(data, `vacaciones_${reportType}_${new Date().toISOString().slice(0, 10)}`, "Vacaciones");
  }

  function handlePDF() {
    const rows = data.map((r) => Object.values(r));
    exportToPDF(
      reportType === "by-technician" ? "Vacaciones por Técnico" : "Vacaciones por Período",
      columns,
      rows,
      `vacaciones_${reportType}_${new Date().toISOString().slice(0, 10)}`
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-52">
          <label className="text-xs text-muted-foreground mb-1 block">Tipo de reporte</label>
          <Select value={reportType} onValueChange={(v) => { setReportType(v as ReportType); setData([]); setFetched(false); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="by-technician">Por técnico</SelectItem>
              <SelectItem value="by-period">Por período</SelectItem>
            </SelectContent>
          </Select>
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

        {reportType === "by-period" && (
          <>
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
          </>
        )}

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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Preview table */}
      {fetched && (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={columns.length} className="text-center py-8 text-muted-foreground">Cargando...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={columns.length} className="text-center py-8 text-muted-foreground">Sin datos para los filtros seleccionados</td></tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={i} className={`hover:bg-muted/40 ${Object.values(row)[0] === "" ? "bg-muted/20" : ""}`}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className={`px-3 py-2 ${j === 0 && val ? "font-medium" : "text-muted-foreground"}`}>
                          {val !== "" && val !== null && val !== undefined ? String(val) : ""}
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
              {data.length} fila{data.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
