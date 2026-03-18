"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ChangeEmailFormProps {
  currentEmail: string;
}

export function ChangeEmailForm({ currentEmail }: ChangeEmailFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    setLoading(true);

    const res = await fetch("/api/profile/email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newEmail }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (data.errors) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.errors as Record<string, string[]>)) {
          fe[k] = (v as string[])[0];
        }
        setFieldErrors(fe);
      } else {
        setError(data.error ?? "Error al cambiar el email");
      }
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewEmail("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Email actual: <span className="font-medium text-foreground">{currentEmail}</span>
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="ce-current-password">Contraseña actual *</Label>
        <Input
          id="ce-current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Tu contraseña actual"
        />
        {fieldErrors.currentPassword && (
          <p className="text-xs text-destructive">{fieldErrors.currentPassword}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ce-new-email">Nuevo email *</Label>
        <Input
          id="ce-new-email"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="nuevo@ejemplo.com"
        />
        {fieldErrors.newEmail && (
          <p className="text-xs text-destructive">{fieldErrors.newEmail}</p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-700">
            Email actualizado correctamente. Por favor vuelve a iniciar sesión con el nuevo email.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading || !currentPassword || !newEmail}
          className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Cambiar email
        </Button>
      </div>
    </form>
  );
}
