"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al procesar la solicitud");
        return;
      }

      setSent(true);
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3 py-4">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <h2 className="text-xl font-bold tracking-tight text-center">Email enviado</h2>
          <p className="text-sm text-muted-foreground text-center">
            Si el email <strong>{email}</strong> está registrado en el sistema, recibirás
            un enlace para restablecer tu contraseña en los próximos minutos.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Revisa también la carpeta de spam.
          </p>
        </div>
        <Link href="/login">
          <Button variant="outline" className="w-full gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Restablecer contraseña</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Introduce tu email y te enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
          disabled={isSubmitting || !email}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar enlace"
          )}
        </Button>
      </form>

      <Link href="/login">
        <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Button>
      </Link>
    </div>
  );
}
