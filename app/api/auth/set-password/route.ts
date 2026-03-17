import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setPasswordSchema } from "@/lib/validations/user";
import { rateLimit, getIp } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

// POST /api/auth/set-password — activate account via invite token
// Rate limit: 10 intentos por IP por hora
export async function POST(req: NextRequest) {
  const rl = rateLimit(`set-password:${getIp(req)}`, 10, 60 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento antes de volver a intentarlo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const body = await req.json();
  const { token, ...rest } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const result = setPasswordSchema.safeParse(rest);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: { id: true, inviteTokenExpiry: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Token inválido o ya utilizado" }, { status: 400 });
  }

  if (!user.inviteTokenExpiry || user.inviteTokenExpiry < new Date()) {
    return NextResponse.json(
      { error: "El enlace ha expirado. Solicita uno nuevo al administrador." },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(result.data.password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      mustChangePassword: false,
      inviteToken: null,
      inviteTokenExpiry: null,
    },
  });

  return NextResponse.json({ ok: true });
}

// GET /api/auth/set-password?token=... — validate token (for page load)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, error: "Token requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: { firstName: true, inviteTokenExpiry: true },
  });

  if (!user) {
    return NextResponse.json({ valid: false, error: "Token inválido o ya utilizado" });
  }

  if (!user.inviteTokenExpiry || user.inviteTokenExpiry < new Date()) {
    return NextResponse.json({ valid: false, error: "El enlace ha expirado" });
  }

  return NextResponse.json({ valid: true, firstName: user.firstName });
}
