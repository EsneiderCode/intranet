"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Loader2 } from "lucide-react";
import { GERMAN_STATES, SHIRT_SIZES } from "@/lib/constants";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/user";

interface ProfileFormProps {
  defaultValues: UpdateProfileInput;
}

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues,
  });

  const shirtSize = watch("shirtSize");
  const state = watch("state");

  async function onSubmit(data: UpdateProfileInput) {
    setServerError(null);
    setSuccess(false);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json();
      setServerError(
        typeof json.error === "string" ? json.error : "Error al guardar los cambios"
      );
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <h3 className="font-semibold text-base">Información personal</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Nombre *</Label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lastName">Apellido *</Label>
          <Input id="lastName" {...register("lastName")} />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" {...register("phone")} placeholder="+49 30 123456" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="birthDate">Fecha de nacimiento *</Label>
          <Input id="birthDate" type="date" {...register("birthDate")} />
          {errors.birthDate && (
            <p className="text-xs text-destructive">{errors.birthDate.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Estado federal</Label>
          <Select
            value={state ?? ""}
            onValueChange={(v) => setValue("state", v as UpdateProfileInput["state"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {GERMAN_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Talla de torso</Label>
          <Select
            value={shirtSize}
            onValueChange={(v) => setValue("shirtSize", v as UpdateProfileInput["shirtSize"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHIRT_SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pantsSize">Talla de pantalón</Label>
          <Input id="pantsSize" {...register("pantsSize")} placeholder="Ej: 32x32, 44, M" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="shoeSize">Talla de zapatos</Label>
          <Input id="shoeSize" {...register("shoeSize")} placeholder="Ej: 42, 43" />
          <p className="text-xs text-muted-foreground">Talla europea de calzado.</p>
        </div>
      </div>

      {serverError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{serverError}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-700">Perfil actualizado correctamente.</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
