"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft } from "lucide-react";

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

interface TransferRequestFormProps {
  itemId: string;
  technicians: Technician[];
  onClose?: () => void;
}

export function TransferRequestForm({ itemId, technicians, onClose }: TransferRequestFormProps) {
  const router = useRouter();
  const [toUserId, setToUserId] = useState("");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toUserId) {
      setError("Selecciona un técnico destinatario");
      return;
    }
    if (!reason.trim()) {
      setError("El motivo es requerido");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/inventory/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, toUserId, reason, location }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Error al realizar la transferencia");
      return;
    }

    setSuccess(true);
    router.refresh();
    setTimeout(() => {
      onClose?.();
    }, 1500);
  }

  if (success) {
    return (
      <div className="py-4 text-center text-sm text-green-700 font-medium">
        Transferencia realizada correctamente.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="toUserId">Transferir a técnico *</Label>
        <Select onValueChange={setToUserId} value={toUserId}>
          <SelectTrigger id="toUserId">
            <SelectValue placeholder="Selecciona un técnico..." />
          </SelectTrigger>
          <SelectContent>
            {technicians.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Lugar donde se realiza</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ej: Almacén central, Obra Frankfurt-Nord..."
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason">Motivo / Explicación *</Label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: El técnico necesita el equipo para el proyecto en curso..."
          maxLength={500}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white gap-2"
          disabled={submitting || !toUserId || !reason.trim()}
        >
          <ArrowRightLeft className="h-4 w-4" />
          {submitting ? "Transfiriendo..." : "Transferir ítem"}
        </Button>
      </div>
    </form>
  );
}
