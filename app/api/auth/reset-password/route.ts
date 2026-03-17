import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setPasswordSchema } from "@/lib/validations/user";
import { rateLimit, getIp } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

// GET /api/auth/reset-password?token=... — valida el token
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: { id: true, inviteTokenExpiry: true, firstName: true },
  });

  if (!user || !user.inviteTokenExpiry || user.inviteTokenExpiry < new Date()) {
    return NextResponse.json(
      { error: "El enlace ha expirado o no es válido." },
      { status: 400 }
    );
  }

  return NextResponse.json({ firstName: user.firstName });
}

// POST /api/auth/reset-password — establece la nueva contraseña
// Rate limit: 10 intentos por IP por hora
export async function POST(req: NextRequest) {
  const rl = rateLimit(`reset-password:${getIp(req)}`, 10, 60 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento antes de volver a intentarlo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { token, password, confirmPassword } = body as {
    token?: string;
    password?: string;
    confirmPassword?: string;
  };

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  const result = setPasswordSchema.safeParse({ password, confirmPassword });
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: { id: true, inviteTokenExpiry: true },
  });

  if (!user || !user.inviteTokenExpiry || user.inviteTokenExpiry < new Date()) {
    return NextResponse.json(
      { error: "El enlace ha expirado o no es válido." },
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

  return NextResponse.json({ message: "Contraseña actualizada correctamente." });
}
