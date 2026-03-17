"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
} from "@/lib/validations/user";

interface UserFormProps {
  mode: "create" | "edit";
  userId?: string;
  defaultValues?: Partial<CreateUserInput>;
  onSuccess?: () => void;
}

export function UserForm({ mode, userId, defaultValues, onSuccess }: UserFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const schema = mode === "create" ? createUserSchema : updateUserSchema;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: {
      shirtSize: "M",
      role: "TECHNICIAN",
      vacationDaysTotal: 24,
      state: "" as CreateUserInput["state"],
      ...defaultValues,
    },
  });

  async function onSubmit(data: CreateUserInput) {
    setServerError(null);
    const url = mode === "create" ? "/api/users" : `/api/users/${userId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json();
      setServerError(
        typeof json.error === "string" ? json.error : "Error al guardar el usuario"
      );
      return;
    }

    setSuccess(true);
    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/users");
      router.refresh();
    }
  }

  const role = watch("role");
  const shirtSize = watch("shirtSize");
  const state = watch("state");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* First name */}
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Nombre *</Label>
          <Input id="firstName" placeholder="Ej: Hans" {...register("firstName")} />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        {/* Last name */}
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Apellido *</Label>
          <Input id="lastName" placeholder="Ej: Müller" {...register("lastName")} />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>

        {/* Email — only on create */}
        {mode === "create" && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" placeholder="hans.muller@umtelkomd.de" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Se enviará un email de invitación a esta dirección para que el usuario active su cuenta.
            </p>
          </div>
        )}

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" {...register("phone")} placeholder="+49 151 12345678" />
          <p className="text-xs text-muted-foreground">Incluye el prefijo internacional (+49).</p>
        </div>

        {/* Birth date */}
        <div className="space-y-1.5">
          <Label htmlFor="birthDate">Fecha de nacimiento *</Label>
          <Input id="birthDate" type="date" {...register("birthDate")} />
          {errors.birthDate && (
            <p className="text-xs text-destructive">{errors.birthDate.message}</p>
          )}
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <Label>Rol *</Label>
          <Select
            value={role}
            onValueChange={(v) => setValue("role", v as "ADMIN" | "TECHNICIAN")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TECHNICIAN">Técnico</SelectItem>
              <SelectItem value="ADMIN">Administrador</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Técnico: acceso a inventario propio y vacaciones. Administrador: acceso total al sistema.
          </p>
        </div>

        {/* State */}
        <div className="space-y-1.5">
          <Label>Estado federal</Label>
          <Select
            value={state ?? ""}
            onValueChange={(v) => setValue("state", v as CreateUserInput["state"])}
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
          {errors.state && (
            <p className="text-xs text-destructive">{errors.state.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Determina los festivos regionales aplicables.
          </p>
        </div>

        {/* Shirt size */}
        <div className="space-y-1.5">
          <Label>Talla de torso (camiseta/chaqueta)</Label>
          <Select
            value={shirtSize}
            onValueChange={(v) => setValue("shirtSize", v as CreateUserInput["shirtSize"])}
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

        {/* Pants size */}
        <div className="space-y-1.5">
          <Label htmlFor="pantsSize">Talla de pantalón</Label>
          <Input id="pantsSize" {...register("pantsSize")} placeholder="Ej: 32x32, 44, M" />
          <p className="text-xs text-muted-foreground">Cintura × largo o talla europea.</p>
        </div>

        {/* Shoe size */}
        <div className="space-y-1.5">
          <Label htmlFor="shoeSize">Talla de zapatos</Label>
          <Input id="shoeSize" {...register("shoeSize")} placeholder="Ej: 42, 43" />
          <p className="text-xs text-muted-foreground">Talla europea de calzado.</p>
        </div>

        {/* Vacation days */}
        <div className="space-y-1.5">
          <Label htmlFor="vacationDaysTotal">Días de vacaciones al año</Label>
          <Input
            id="vacationDaysTotal"
            type="number"
            min={0}
            max={365}
            {...register("vacationDaysTotal", { valueAsNumber: true })}
          />
          {errors.vacationDaysTotal && (
            <p className="text-xs text-destructive">{errors.vacationDaysTotal.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Días laborables disponibles. Por defecto: 24.
          </p>
        </div>
      </div>

      {serverError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{serverError}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-700">
            {mode === "create"
              ? "Usuario creado. Se ha enviado el email de invitación."
              : "Usuario actualizado correctamente."}
          </p>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/users")}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Crear y enviar invitación" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
