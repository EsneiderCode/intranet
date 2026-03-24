import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validations/user";
import { autoAssignHolidaysToUser } from "@/lib/holiday-assignment";

// GET /api/users/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
      mustChangePassword: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}

// PATCH /api/users/[id] — update user (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const result = updateUserSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const data = result.data;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.birthDate !== undefined && { birthDate: new Date(data.birthDate) }),
      ...(data.shirtSize !== undefined && { shirtSize: data.shirtSize }),
      ...(data.pantsSize !== undefined && { pantsSize: data.pantsSize }),
      ...(data.shoeSize !== undefined && { shoeSize: data.shoeSize }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.vacationDaysPerYear !== undefined && {
        vacationDaysPerYear: data.vacationDaysPerYear,
      }),
      ...(data.vacationDaysCarryOver !== undefined && {
        vacationDaysCarryOver: data.vacationDaysCarryOver,
      }),
      ...(data.vacationDaysUsedExternal !== undefined && {
        vacationDaysUsedExternal: data.vacationDaysUsedExternal,
      }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  // Auto-assign holidays if state was updated (non-blocking)
  if (data.state !== undefined && data.state) {
    autoAssignHolidaysToUser(id, data.state).catch((err) =>
      console.error("[holidays] Failed to auto-assign holidays on state update:", err)
    );
  }

  return NextResponse.json(user);
}

// DELETE /api/users/[id] — soft delete (deactivate)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json(
      { error: "No puedes desactivar tu propia cuenta" },
      { status: 400 }
    );
  }

  // Toggle isActive
  const existing = await prisma.user.findUnique({ where: { id }, select: { isActive: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: !existing.isActive },
    select: { id: true, isActive: true },
  });

  return NextResponse.json(user);
}
