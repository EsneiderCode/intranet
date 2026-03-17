import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createUserSchema } from "@/lib/validations/user";
import { sendInviteEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// GET /api/users — list all users (admin only)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const role = searchParams.get("role") ?? "";
  const isActive = searchParams.get("isActive");

  const users = await prisma.user.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        role ? { role: role as "ADMIN" | "TECHNICIAN" } : {},
        isActive !== null && isActive !== ""
          ? { isActive: isActive === "true" }
          : {},
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      state: true,
      isActive: true,
      vacationDaysTotal: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

// POST /api/users — create user + send invite (admin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = createUserSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const data = result.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json({ error: "Este email ya está registrado" }, { status: 409 });
  }

  // Generate a temporary password and invite token
  const tempPassword = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10);
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const inviteTokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: tempPassword,
      phone: data.phone ?? "",
      birthDate: new Date(data.birthDate),
      shirtSize: data.shirtSize,
      pantsSize: data.pantsSize ?? "",
      shoeSize: data.shoeSize ?? "",
      role: data.role,
      state: data.state ?? "",
      vacationDaysTotal: data.vacationDaysTotal,
      mustChangePassword: true,
      inviteToken,
      inviteTokenExpiry,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Send invite email (non-blocking failure)
  try {
    await sendInviteEmail({
      to: user.email,
      firstName: user.firstName,
      token: inviteToken,
    });
  } catch (err) {
    console.error("Failed to send invite email:", err);
  }

  return NextResponse.json(user, { status: 201 });
}
