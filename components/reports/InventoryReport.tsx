"use client";

import { useState, useEffect } from "react";
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

interface InventoryRow {
  id: string;
  name: string;
  description: string;
  status: string;
  assignedTo: string;
  addedBy: string;
  createdAt: string;
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  technicians: Technician[];
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "AVAILABLE", label: "Disponible" },
  { value: "IN_USE", label: "En uso" },
  { value: "IN_REPAIR", label: "En reparación" },
  { value: "DECOMMISSIONED", label: "Dado de baja" },
];

export function InventoryReport({ technicians }: Props) {
  const [data, setData] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [assignedToId, setAssignedToId] = useState("");

  async function fetchData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (assignedToId) params.set("assignedToId", assignedToId);
    const res = await fetch(`/api/reports/inventory?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const PDF_COLUMNS = ["Nombre", "Descripción", "Estado", "Técnico asignado", "Agregado por", "Fecha"];
  const excelRows = data.map((item) => ({
    Nombre: item.name,
    "Descripción": item.description,
    Estado: item.status,
    "Técnico asignado": item.assignedTo,
    "Agregado por": item.addedBy,
    Fecha: item.createdAt,
  }));

  function handleExcel() {
    exportToExcel(excelRows, `inventario_${new Date().toISOString().slice(0, 10)}`, "Inventario");
  }

  function handlePDF() {
    exportToPDF(
      "Reporte de Inventario",
      PDF_COLUMNS,
      data.map((r) => [r.name, r.description, r.status, r.assignedTo, r.addedBy, r.createdAt]),
      `inventario_${new Date().toISOString().slice(0, 10)}`
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-44">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value || "all"} value={o.value || "all"}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <Select value={assignedToId} onValueChange={setAssignedToId}>
            <SelectTrigger><SelectValue placeholder="Técnico asignado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los técnicos</SelectItem>
              <SelectItem value="unassigned">Sin asignar</SelectItem>
              {technicians.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Aplicar
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExcel} disabled={loading || data.length === 0}>
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePDF} disabled={loading || data.length === 0}>
            <FileText className="h-4 w-4 text-red-600" />
            PDF
          </Button>
        </div>
      </div>

      {/* Preview table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {PDF_COLUMNS.map((c) => (
                  <th key={c} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Sin datos</td></tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 text-muted-foreground max-w-xs truncate">{r.description}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.assignedTo}</td>
                    <td className="px-3 py-2">{r.addedBy}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.createdAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data.length > 0 && (
          <div className="px-3 py-2 bg-muted/50 text-xs text-muted-foreground border-t">
            {data.length} ítem{data.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
