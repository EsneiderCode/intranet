import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/users/ProfileForm";
import type { UpdateProfileInput } from "@/lib/validations/user";
import { AvatarUpload } from "@/components/users/AvatarUpload";
import { RoleBadge } from "@/components/users/UserStatusBadge";
import { ChangeEmailForm } from "@/components/users/ChangeEmailForm";
import { ChangePasswordForm } from "@/components/users/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      birthDate: true,
      shirtSize: true,
      pantsSize: true,
      shoeSize: true,
      state: true,
      avatarUrl: true,
      role: true,
      vacationDaysPerYear: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
        <p className="text-muted-foreground">Administra tu información personal.</p>
      </div>

      {/* Avatar section */}
      <div className="rounded-lg border bg-card p-6 flex flex-col sm:flex-row items-center gap-6">
        <AvatarUpload
          currentUrl={user.avatarUrl}
          name={`${user.firstName} ${user.lastName}`}
        />
        <div>
          <h2 className="text-xl font-semibold">
            {user.firstName} {user.lastName}
          </h2>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <RoleBadge role={user.role} />
            <span className="text-sm text-muted-foreground">
              {user.vacationDaysPerYear} días de vacaciones anuales
            </span>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="rounded-lg border bg-card p-6">
        <ProfileForm
          defaultValues={{
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone ?? "",
            birthDate: user.birthDate.toISOString().split("T")[0],
            shirtSize: user.shirtSize,
            pantsSize: user.pantsSize ?? "",
            shoeSize: user.shoeSize ?? "",
            state: (user.state as UpdateProfileInput["state"]) ?? "",
          }}
        />
      </div>

      {/* Change email */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="font-semibold text-base mb-4">Cambiar email</h3>
        <ChangeEmailForm currentEmail={user.email} />
      </div>

      {/* Change password */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="font-semibold text-base mb-4">Cambiar contraseña</h3>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
