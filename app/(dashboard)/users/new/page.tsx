import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserForm } from "@/components/users/UserForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewUserPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/users"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a usuarios
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo usuario</h1>
        <p className="text-muted-foreground">
          Se enviará un email de invitación para que el técnico establezca su contraseña.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <UserForm mode="create" />
      </div>
    </div>
  );
}
