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
import { ArrowRightLeft, CheckCircle2, XCircle, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

interface Squad {
  id: string;
  name: string;
}

interface TransferRequestFormProps {
  itemId: string;
  isElectronic: boolean;
  technicians: Technician[];
  squads?: Squad[];
  onClose?: () => void;
}

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

function PhotoUpload({
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

export function TransferRequestForm({ itemId, isElectronic, technicians, squads = [], onClose }: TransferRequestFormProps) {
  const router = useRouter();
  const [destType, setDestType] = useState<"technician" | "squad">("technician");
  const [toUserId, setToUserId] = useState("");
  const [toSquadId, setToSquadId] = useState("");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");

  // Checklist state
  const [checklistBrokenParts, setChecklistBrokenParts] = useState<boolean | null>(null);
  const [checklistCase, setChecklistCase] = useState<boolean | null>(null);
  const [checklistCharger, setChecklistCharger] = useState<boolean | null>(null);
  const casePhotoRef = useRef<HTMLInputElement>(null);
  const chargerPhotoRef = useRef<HTMLInputElement>(null);
  const [casePhotoFile, setCasePhotoFile] = useState<File | null>(null);
  const [casePhotoPreview, setCasePhotoPreview] = useState("");
  const [chargerPhotoFile, setChargerPhotoFile] = useState<File | null>(null);
  const [chargerPhotoPreview, setChargerPhotoPreview] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setErrors({});

    const fieldErrors: Record<string, string> = {};
    if (destType === "technician" && !toUserId) fieldErrors.dest = "Selecciona un técnico destinatario";
    if (destType === "squad" && !toSquadId) fieldErrors.dest = "Selecciona una cuadrilla destinataria";
    if (!reason.trim()) fieldErrors.reason = "El motivo es requerido";
    if (checklistBrokenParts === null) fieldErrors.checklistBrokenParts = "Indica si tiene partes rotas";
    if (checklistCase === null) fieldErrors.checklistCase = "Indica si tiene estuche";
    if (checklistCase === true && !casePhotoFile) fieldErrors.checklistCasePhoto = "Añade una foto del estuche";
    if (isElectronic) {
      if (checklistCharger === null) fieldErrors.checklistCharger = "Indica si tiene cargador";
      if (checklistCharger === true && !chargerPhotoFile) fieldErrors.checklistChargerPhoto = "Añade una foto del cargador";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("itemId", itemId);
    formData.append("reason", reason.trim());
    formData.append("location", location.trim());
    if (destType === "technician") {
      formData.append("toUserId", toUserId);
    } else {
      formData.append("toSquadId", toSquadId);
    }
    formData.append("checklistBrokenParts", String(checklistBrokenParts));
    formData.append("checklistCase", String(checklistCase));
    if (isElectronic) formData.append("checklistCharger", String(checklistCharger));
    if (casePhotoFile) formData.append("checklistCasePhoto", casePhotoFile);
    if (chargerPhotoFile) formData.append("checklistChargerPhoto", chargerPhotoFile);

    const res = await fetch("/api/inventory/transfers", {
      method: "POST",
      body: formData,
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

  const destSelected = destType === "technician" ? !!toUserId : !!toSquadId;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Destination type toggle */}
      <div className="space-y-2">
        <Label>Transferir a</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setDestType("technician"); setToSquadId(""); }}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
              destType === "technician"
                ? "border-[#1E3A5F] bg-[#1E3A5F]/5 text-[#1E3A5F]"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
            )}
          >
            Técnico
          </button>
          {squads.length > 0 && (
            <button
              type="button"
              onClick={() => { setDestType("squad"); setToUserId(""); }}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                destType === "squad"
                  ? "border-[#1E3A5F] bg-[#1E3A5F]/5 text-[#1E3A5F]"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
              )}
            >
              Cuadrilla
            </button>
          )}
        </div>
        {errors.dest && <p className="text-xs text-destructive">{errors.dest}</p>}
      </div>

      {destType === "technician" ? (
        <div className="space-y-1.5">
          <Label htmlFor="toUserId">Técnico *</Label>
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
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="toSquadId">Cuadrilla *</Label>
          <Select onValueChange={setToSquadId} value={toSquadId}>
            <SelectTrigger id="toSquadId">
              <SelectValue placeholder="Selecciona una cuadrilla..." />
            </SelectTrigger>
            <SelectContent>
              {squads.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
          placeholder="Ej: El equipo necesita la herramienta para el proyecto en curso..."
          maxLength={500}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.reason && <p className="text-xs text-destructive">{errors.reason}</p>}
      </div>

      {/* Checklist */}
      <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-4">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
          Checklist de estado al transferir
        </p>

        {/* Broken parts */}
        <div className="space-y-1.5">
          <Label className="text-sm">¿Tiene partes rotas o dañadas? *</Label>
          <div className="flex gap-2">
            <YesNoButton value={true} selected={checklistBrokenParts === true} onClick={() => setChecklistBrokenParts(true)} label="Sí" />
            <YesNoButton value={false} selected={checklistBrokenParts === false} onClick={() => setChecklistBrokenParts(false)} label="No" />
          </div>
          {errors.checklistBrokenParts && <p className="text-xs text-destructive">{errors.checklistBrokenParts}</p>}
        </div>

        {/* Case */}
        <div className="space-y-1.5">
          <Label className="text-sm">¿Tiene estuche? *</Label>
          <div className="flex gap-2">
            <YesNoButton value={true} selected={checklistCase === true} onClick={() => setChecklistCase(true)} label="Sí" />
            <YesNoButton value={false} selected={checklistCase === false} onClick={() => { setChecklistCase(false); setCasePhotoFile(null); setCasePhotoPreview(""); }} label="No" />
          </div>
          {errors.checklistCase && <p className="text-xs text-destructive">{errors.checklistCase}</p>}
          {checklistCase === true && (
            <div className="mt-2 space-y-1">
              <Label className="text-xs">Foto del estuche *</Label>
              <PhotoUpload
                preview={casePhotoPreview}
                inputRef={casePhotoRef}
                onFileChange={(file) => { setCasePhotoFile(file); setCasePhotoPreview(URL.createObjectURL(file)); }}
                onClear={() => { setCasePhotoFile(null); setCasePhotoPreview(""); if (casePhotoRef.current) casePhotoRef.current.value = ""; }}
              />
              {errors.checklistCasePhoto && <p className="text-xs text-destructive">{errors.checklistCasePhoto}</p>}
            </div>
          )}
        </div>

        {/* Charger (only if electronic) */}
        {isElectronic && (
          <div className="space-y-1.5">
            <Label className="text-sm">¿Tiene cargador? *</Label>
            <div className="flex gap-2">
              <YesNoButton value={true} selected={checklistCharger === true} onClick={() => setChecklistCharger(true)} label="Sí" />
              <YesNoButton value={false} selected={checklistCharger === false} onClick={() => { setChecklistCharger(false); setChargerPhotoFile(null); setChargerPhotoPreview(""); }} label="No" />
            </div>
            {errors.checklistCharger && <p className="text-xs text-destructive">{errors.checklistCharger}</p>}
            {checklistCharger === true && (
              <div className="mt-2 space-y-1">
                <Label className="text-xs">Foto del cargador *</Label>
                <PhotoUpload
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white gap-2"
          disabled={submitting || !destSelected || !reason.trim()}
        >
          <ArrowRightLeft className="h-4 w-4" />
          {submitting ? "Transfiriendo..." : "Transferir ítem"}
        </Button>
      </div>
    </form>
  );
}
