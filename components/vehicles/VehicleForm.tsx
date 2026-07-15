"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VehicleFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    plate: string;
    description: string;
    isActive: boolean;
  };
}

export function VehicleForm({ mode, initialData }: VehicleFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [plate, setPlate] = useState(initialData?.plate ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError("");

    if (!name.trim()) {
      setErrors({ name: "El nombre es requerido" });
      return;
    }

    setSubmitting(true);

    const url = mode === "create" ? "/api/vehicles" : `/api/vehicles/${initialData!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        plate: plate.trim(),
        description: description.trim(),
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      if (data.error?.fieldErrors) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.error.fieldErrors as Record<string, string[]>)) {
          fe[k] = v[0];
        }
        setErrors(fe);
      } else {
        setServerError(typeof data.error === "string" ? data.error : "Error al guardar");
      }
      return;
    }

    router.push("/vehicles");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Van 1, Camioneta Norte..."
          maxLength={100}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="plate">Placa / Matrícula</Label>
        <Input
          id="plate"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          placeholder="Ej: HH-AB 1234"
          maxLength={20}
        />
        {errors.plate && <p className="text-sm text-destructive">{errors.plate}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción opcional del vehículo..."
          maxLength={500}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white" disabled={submitting}>
          {submitting
            ? mode === "create" ? "Creando..." : "Guardando..."
            : mode === "create" ? "Crear vehículo" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
