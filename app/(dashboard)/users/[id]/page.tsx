import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserForm } from "@/components/users/UserForm";
import type { CreateUserInput } from "@/lib/validations/user";
import { UserStatusBadge, RoleBadge } from "@/components/users/UserStatusBadge";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
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
      role: true,
      avatarUrl: true,
      state: true,
      isActive: true,
      vacationDaysPerYear: true,
      vacationDaysCarryOver: true,
      vacationDaysUsedExternal: true,
    },
  });

  if (!user) notFound();

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

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
        <div className="flex items-center gap-4">
          <AvatarPrimitive.Root className="h-14 w-14 rounded-full overflow-hidden bg-muted flex-shrink-0">
            <AvatarPrimitive.Image
              src={user.avatarUrl ?? undefined}
              alt={user.firstName}
              className="h-full w-full object-cover"
            />
            <AvatarPrimitive.Fallback className="h-full w-full flex items-center justify-center text-lg font-semibold text-muted-foreground">
              {initials}
            </AvatarPrimitive.Fallback>
          </AvatarPrimitive.Root>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {user.firstName} {user.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <RoleBadge role={user.role} />
              <UserStatusBadge isActive={user.isActive} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <UserForm
          mode="edit"
          userId={user.id}
          defaultValues={{
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone ?? "",
            birthDate: user.birthDate.toISOString().split("T")[0],
            shirtSize: user.shirtSize,
            pantsSize: user.pantsSize ?? "",
            shoeSize: user.shoeSize ?? "",
            role: user.role,
            state: (user.state as CreateUserInput["state"]) ?? "",
            vacationDaysPerYear: user.vacationDaysPerYear,
            vacationDaysCarryOver: user.vacationDaysCarryOver,
            vacationDaysUsedExternal: user.vacationDaysUsedExternal,
          }}
        />
      </div>
    </div>
  );
}
