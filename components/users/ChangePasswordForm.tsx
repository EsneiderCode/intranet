"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    const res = await fetch("/api/profile/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
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
        setError(data.error ?? "Error al cambiar la contraseña");
      }
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cp-current">Contraseña actual *</Label>
        <Input
          id="cp-current"
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
        <Label htmlFor="cp-new">Nueva contraseña *</Label>
        <Input
          id="cp-new"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
        />
        {fieldErrors.newPassword && (
          <p className="text-xs text-destructive">{fieldErrors.newPassword}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cp-confirm">Confirmar nueva contraseña *</Label>
        <Input
          id="cp-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repite la nueva contraseña"
        />
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-700">Contraseña actualizada correctamente.</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}
