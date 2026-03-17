"use client";

import { useState, useRef } from "react";
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
import { ImagePlus, X } from "lucide-react";

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

interface InventoryFormProps {
  mode: "create" | "edit";
  isAdmin: boolean;
  currentUserId: string;
  technicians?: Technician[];
  initialData?: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    status: string;
    assignedToId?: string | null;
  };
}

const STATUSES = [
  { value: "AVAILABLE", label: "Disponible" },
  { value: "IN_USE", label: "En uso" },
  { value: "IN_REPAIR", label: "En reparación" },
  { value: "DECOMMISSIONED", label: "Dado de baja" },
];

export function InventoryForm({
  mode,
  isAdmin,
  currentUserId,
  technicians = [],
  initialData,
}: InventoryFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [status, setStatus] = useState(initialData?.status ?? "AVAILABLE");
  const [assignedToId, setAssignedToId] = useState(
    initialData?.assignedToId ?? (isAdmin ? "none" : currentUserId)
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError("");

    const fieldErrors: Record<string, string> = {};
    if (!name.trim()) fieldErrors.name = "El nombre es requerido";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append("status", status);
    if (isAdmin) {
      formData.append("assignedToId", assignedToId);
    }
    if (imageFile) {
      formData.append("image", imageFile);
    }

    const url = mode === "create" ? "/api/inventory" : `/api/inventory/${initialData!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, { method, body: formData });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      if (data.error?.fieldErrors) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.error.fieldErrors as Record<string, string[]>)) {
          fe[k] = (v as string[])[0];
        }
        setErrors(fe);
      } else {
        setServerError(typeof data.error === "string" ? data.error : "Error al guardar");
      }
      return;
    }

    router.push("/inventory");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Image upload */}
      <div className="space-y-1.5">
        <Label>Imagen del ítem</Label>
        <div className="flex items-start gap-4">
          <div
            className="relative w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden cursor-pointer hover:border-muted-foreground/60 transition-colors flex-shrink-0"
            onClick={() => fileRef.current?.click()}
          >
            {imagePreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearImage();
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground/70 text-center px-2">
                  Subir imagen
                </span>
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground pt-2 space-y-1">
            <p>Haz clic para subir una imagen.</p>
            <p>JPG, PNG o WebP. Máx. 5 MB.</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Taladro Bosch Pro 18V"
          maxLength={100}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción opcional del ítem..."
          maxLength={500}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <Label htmlFor="status">Estado</Label>
        <Select onValueChange={setStatus} value={status}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assigned technician (admin only) */}
      {isAdmin && (
        <div className="space-y-1.5">
          <Label htmlFor="assignedToId">Asignar a técnico</Label>
          <Select onValueChange={setAssignedToId} value={assignedToId}>
            <SelectTrigger id="assignedToId">
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {technicians.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
          disabled={submitting}
        >
          {submitting
            ? mode === "create"
              ? "Creando..."
              : "Guardando..."
            : mode === "create"
            ? "Crear ítem"
            : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
