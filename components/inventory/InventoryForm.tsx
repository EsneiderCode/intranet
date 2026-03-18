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
import { ImagePlus, Plus, X, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

interface ExistingPhoto {
  id: string;
  url: string;
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
    photos?: ExistingPhoto[];
  };
}

const STATUSES = [
  { value: "AVAILABLE", label: "Disponible" },
  { value: "IN_USE", label: "En uso" },
  { value: "IN_REPAIR", label: "En reparación" },
  { value: "DECOMMISSIONED", label: "Dado de baja" },
];

function YesNoButton({
  value,
  selected,
  onClick,
  label,
}: {
  value: boolean;
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
        selected
          ? value
            ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
            : "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
      )}
    >
      {selected ? (
        value ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />
      ) : null}
      {label}
    </button>
  );
}

function ChecklistPhotoUpload({
  preview,
  inputRef,
  onFileChange,
  onClear,
}: {
  preview: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="relative w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden cursor-pointer hover:border-muted-foreground/60 transition-colors flex-shrink-0"
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <ImagePlus className="h-6 w-6 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground/70 text-center px-1">Subir foto</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); }}
      />
    </div>
  );
}

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

  // Secondary photos
  const extraFileRef = useRef<HTMLInputElement>(null);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>(initialData?.photos ?? []);
  const [newExtraFiles, setNewExtraFiles] = useState<File[]>([]);
  const [newExtraPreviews, setNewExtraPreviews] = useState<string[]>([]);

  // Checklist state (only required at creation)
  const [isElectronic, setIsElectronic] = useState(false);
  const [checklistBrokenParts, setChecklistBrokenParts] = useState<boolean | null>(null);
  const [checklistCase, setChecklistCase] = useState<boolean | null>(null);
  const [checklistCharger, setChecklistCharger] = useState<boolean | null>(null);

  // Checklist photo files
  const casePhotoRef = useRef<HTMLInputElement>(null);
  const chargerPhotoRef = useRef<HTMLInputElement>(null);
  const [casePhotoFile, setCasePhotoFile] = useState<File | null>(null);
  const [casePhotoPreview, setCasePhotoPreview] = useState("");
  const [chargerPhotoFile, setChargerPhotoFile] = useState<File | null>(null);
  const [chargerPhotoPreview, setChargerPhotoPreview] = useState("");

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

  function handleExtraFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setNewExtraFiles((prev) => [...prev, ...files]);
    setNewExtraPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    if (extraFileRef.current) extraFileRef.current.value = "";
  }

  function removeNewExtra(index: number) {
    setNewExtraFiles((prev) => prev.filter((_, i) => i !== index));
    setNewExtraPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function deleteExistingPhoto(photoId: string) {
    if (!initialData?.id) return;
    await fetch(`/api/inventory/${initialData.id}/photos/${photoId}`, { method: "DELETE" });
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError("");

    const fieldErrors: Record<string, string> = {};
    if (!name.trim()) fieldErrors.name = "El nombre es requerido";

    // Checklist validation (only required at creation)
    if (mode === "create") {
      if (checklistBrokenParts === null) fieldErrors.checklistBrokenParts = "Indica si tiene partes rotas";
      if (checklistCase === null) fieldErrors.checklistCase = "Indica si tiene estuche";
      if (checklistCase === true && !casePhotoFile) fieldErrors.checklistCasePhoto = "Añade una foto del estuche";
      if (isElectronic) {
        if (checklistCharger === null) fieldErrors.checklistCharger = "Indica si tiene cargador";
        if (checklistCharger === true && !chargerPhotoFile) fieldErrors.checklistChargerPhoto = "Añade una foto del cargador";
      }
    }

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

    // Append checklist fields at creation
    if (mode === "create") {
      formData.append("isElectronic", String(isElectronic));
      if (checklistBrokenParts !== null) formData.append("checklistBrokenParts", String(checklistBrokenParts));
      if (checklistCase !== null) formData.append("checklistCase", String(checklistCase));
      if (isElectronic && checklistCharger !== null) formData.append("checklistCharger", String(checklistCharger));
      if (casePhotoFile) formData.append("checklistCasePhoto", casePhotoFile);
      if (chargerPhotoFile) formData.append("checklistChargerPhoto", chargerPhotoFile);
    }

    newExtraFiles.forEach((file, i) => {
      formData.append(`extraImage_${i}`, file);
    });

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

      {/* Secondary photos */}
      <div className="space-y-1.5">
        <Label>Fotos adicionales</Label>
        <div className="flex flex-wrap gap-3 items-start">
          {/* Existing photos (edit mode) */}
          {existingPhotos.map((photo) => (
            <div key={photo.id} className="relative w-20 h-20 rounded-lg border overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="Foto" className="w-full h-full object-cover" />
              <button
                type="button"
                className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                onClick={() => deleteExistingPhoto(photo.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* New queued photos */}
          {newExtraPreviews.map((src, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg border overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Nueva foto" className="w-full h-full object-cover" />
              <button
                type="button"
                className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                onClick={() => removeNewExtra(i)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Add button */}
          <button
            type="button"
            className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 transition-colors flex flex-col items-center justify-center gap-1 flex-shrink-0"
            onClick={() => extraFileRef.current?.click()}
          >
            <Plus className="h-5 w-5 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground/70">Añadir</span>
          </button>
        </div>
        <input
          ref={extraFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleExtraFilesChange}
        />
        <p className="text-xs text-muted-foreground">Puedes añadir varias fotos adicionales del ítem.</p>
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

      {/* Checklist — only shown at creation */}
      {mode === "create" && (
        <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-4">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
            Checklist de estado del ítem (obligatorio)
          </p>

          {/* Is electronic */}
          <div className="space-y-1.5">
            <Label>¿Es un equipo eléctrico?</Label>
            <div className="flex gap-2">
              <YesNoButton value={isElectronic} selected={true} onClick={() => setIsElectronic(true)} label="Sí" />
              <YesNoButton value={false} selected={!isElectronic} onClick={() => { setIsElectronic(false); setChecklistCharger(null); setChargerPhotoFile(null); setChargerPhotoPreview(""); }} label="No" />
            </div>
          </div>

          {/* Broken parts */}
          <div className="space-y-1.5">
            <Label>¿Tiene partes rotas o dañadas? *</Label>
            <div className="flex gap-2">
              <YesNoButton value={true} selected={checklistBrokenParts === true} onClick={() => setChecklistBrokenParts(true)} label="Sí" />
              <YesNoButton value={false} selected={checklistBrokenParts === false} onClick={() => setChecklistBrokenParts(false)} label="No" />
            </div>
            {errors.checklistBrokenParts && <p className="text-xs text-destructive">{errors.checklistBrokenParts}</p>}
          </div>

          {/* Case */}
          <div className="space-y-1.5">
            <Label>¿Tiene estuche? *</Label>
            <div className="flex gap-2">
              <YesNoButton value={true} selected={checklistCase === true} onClick={() => setChecklistCase(true)} label="Sí" />
              <YesNoButton value={false} selected={checklistCase === false} onClick={() => { setChecklistCase(false); setCasePhotoFile(null); setCasePhotoPreview(""); }} label="No" />
            </div>
            {errors.checklistCase && <p className="text-xs text-destructive">{errors.checklistCase}</p>}
            {checklistCase === true && (
              <div className="mt-2 space-y-1">
                <Label className="text-xs">Foto del estuche *</Label>
                <ChecklistPhotoUpload
                  preview={casePhotoPreview}
                  inputRef={casePhotoRef}
                  onFileChange={(file) => { setCasePhotoFile(file); setCasePhotoPreview(URL.createObjectURL(file)); }}
                  onClear={() => { setCasePhotoFile(null); setCasePhotoPreview(""); if (casePhotoRef.current) casePhotoRef.current.value = ""; }}
                />
                {errors.checklistCasePhoto && <p className="text-xs text-destructive">{errors.checklistCasePhoto}</p>}
              </div>
            )}
          </div>

          {/* Charger (only if electric) */}
          {isElectronic && (
            <div className="space-y-1.5">
              <Label>¿Tiene cargador? *</Label>
              <div className="flex gap-2">
                <YesNoButton value={true} selected={checklistCharger === true} onClick={() => setChecklistCharger(true)} label="Sí" />
                <YesNoButton value={false} selected={checklistCharger === false} onClick={() => { setChecklistCharger(false); setChargerPhotoFile(null); setChargerPhotoPreview(""); }} label="No" />
              </div>
              {errors.checklistCharger && <p className="text-xs text-destructive">{errors.checklistCharger}</p>}
              {checklistCharger === true && (
                <div className="mt-2 space-y-1">
                  <Label className="text-xs">Foto del cargador *</Label>
                  <ChecklistPhotoUpload
                    preview={chargerPhotoPreview}
                    inputRef={chargerPhotoRef}
                    onFileChange={(file) => { setChargerPhotoFile(file); setChargerPhotoPreview(URL.createObjectURL(file)); }}
                    onClear={() => { setChargerPhotoFile(null); setChargerPhotoPreview(""); if (chargerPhotoRef.current) chargerPhotoRef.current.value = ""; }}
                  />
                  {errors.checklistChargerPhoto && <p className="text-xs text-destructive">{errors.checklistChargerPhoto}</p>}
                </div>
              )}
            </div>
          )}
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
