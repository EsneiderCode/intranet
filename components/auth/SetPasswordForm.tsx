"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { setPasswordSchema, type SetPasswordInput } from "@/lib/validations/user";
import { APP_NAME } from "@/lib/constants";

interface SetPasswordFormProps {
  token: string;
}

export function SetPasswordForm({ token }: SetPasswordFormProps) {
  const router = useRouter();
  const [tokenState, setTokenState] = useState<{
    valid: boolean | null;
    firstName: string;
    error: string;
  }>({ valid: null, firstName: "", error: "" });
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
  });

  useEffect(() => {
    fetch(`/api/auth/set-password?token=${token}`)
      .then((r) => r.json())
      .then((data) =>
        setTokenState({
          valid: data.valid,
          firstName: data.firstName ?? "",
          error: data.error ?? "",
        })
      )
      .catch(() =>
        setTokenState({ valid: false, firstName: "", error: "Error de conexión" })
      );
  }, [token]);

  async function onSubmit(data: SetPasswordInput) {
    setServerError(null);
    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...data }),
    });

    if (!res.ok) {
      const json = await res.json();
      setServerError(json.error ?? "Error al establecer la contraseña");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 3000);
  }

  // Loading state
  if (tokenState.valid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invalid token
  if (tokenState.valid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Enlace no válido</h1>
          <p className="text-muted-foreground">{tokenState.error}</p>
          <p className="text-sm text-muted-foreground">
            Contacta al administrador para solicitar un nuevo enlace de activación.
          </p>
        </div>
      </div>
    );
  }

  // Success
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">¡Cuenta activada!</h1>
          <p className="text-muted-foreground">
            Tu cuenta ha sido activada correctamente. Redirigiendo al login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 bg-[#1E3A5F] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">U</span>
          </div>
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          <p className="text-muted-foreground mt-1">
            Hola, <strong>{tokenState.firstName}</strong>. Establece tu contraseña para activar tu cuenta.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repite la contraseña"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {serverError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{serverError}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activar mi cuenta
            </Button>
          </form>

          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground font-medium mb-1">Requisitos de contraseña:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• Mínimo 8 caracteres</li>
              <li>• Al menos una letra mayúscula</li>
              <li>• Al menos un número</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
