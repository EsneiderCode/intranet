"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { User, HardHat, Truck, MapPin, CircleSlash } from "lucide-react";

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

interface Squad {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  name: string;
}

type TargetType = "technician" | "squad" | "vehicle" | "location" | "unassign";

interface BulkAssignDialogProps {
  open: boolean;
  onClose: () => void;
  itemIds: string[];
  /** Optional label describing the selection, e.g. the group name */
  contextLabel?: string;
  technicians: Technician[];
  squads: Squad[];
  vehicles: Vehicle[];
  onDone?: () => void;
}

const TARGET_OPTIONS: { key: TargetType; label: string; icon: typeof User }[] = [
  { key: "technician", label: "Técnico", icon: User },
  { key: "squad", label: "Cuadrilla", icon: HardHat },
  { key: "vehicle", label: "Vehículo", icon: Truck },
  { key: "location", label: "Ubicación", icon: MapPin },
  { key: "unassign", label: "Desasignar", icon: CircleSlash },
];

export function BulkAssignDialog({
  open,
  onClose,
  itemIds,
  contextLabel,
  technicians,
  squads,
  vehicles,
  onDone,
}: BulkAssignDialogProps) {
  const router = useRouter();
  const [targetType, setTargetType] = useState<TargetType>("technician");
  const [technicianId, setTechnicianId] = useState("");
  const [squadId, setSquadId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setTargetType("technician");
    setTechnicianId("");
    setSquadId("");
    setVehicleId("");
    setLocation("");
    setError("");
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit() {
    setError("");

    let target:
      | { type: "technician" | "squad" | "vehicle"; id: string }
      | { type: "location"; location: string }
      | { type: "unassign" };

    if (targetType === "technician") {
      if (!technicianId) { setError("Selecciona un técnico"); return; }
      target = { type: "technician", id: technicianId };
    } else if (targetType === "squad") {
      if (!squadId) { setError("Selecciona una cuadrilla"); return; }
      target = { type: "squad", id: squadId };
    } else if (targetType === "vehicle") {
      if (!vehicleId) { setError("Selecciona un vehículo"); return; }
      target = { type: "vehicle", id: vehicleId };
    } else if (targetType === "location") {
      if (!location.trim()) { setError("Escribe la ubicación"); return; }
      target = { type: "location", location: location.trim() };
    } else {
      target = { type: "unassign" };
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds, target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Error al aplicar los cambios");
        return;
      }
      reset();
      onDone?.();
      onClose();
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover {itemIds.length} ítem(s)</DialogTitle>
          <DialogDescription>
            {contextLabel
              ? `Se moverán todos los ítems de ${contextLabel} al destino que elijas.`
              : "Elige el destino para los ítems seleccionados."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Destino</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TARGET_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setTargetType(opt.key)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                      targetType === opt.key
                        ? "border-[#1E3A5F] bg-[#1E3A5F]/5 text-[#1E3A5F]"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {targetType === "technician" && (
            <Select onValueChange={setTechnicianId} value={technicianId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {targetType === "squad" && (
            <Select onValueChange={setSquadId} value={squadId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una cuadrilla" />
              </SelectTrigger>
              <SelectContent>
                {squads.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {targetType === "vehicle" && (
            <div className="space-y-1.5">
              <Select onValueChange={setVehicleId} value={vehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vehicles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay vehículos registrados. Créalos en la sección Vehículos.
                </p>
              )}
            </div>
          )}

          {targetType === "location" && (
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Bodega Hamburgo, Oficina central..."
              maxLength={200}
            />
          )}

          {targetType === "unassign" && (
            <p className="text-sm text-muted-foreground">
              Los ítems quedarán sin técnico, cuadrilla, vehículo ni ubicación.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Aplicando..." : `Mover ${itemIds.length} ítem(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
