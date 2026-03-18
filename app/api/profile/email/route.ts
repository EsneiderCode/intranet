import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
  newEmail: z.string().email("Email inválido"),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { currentPassword, newEmail } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
  }

  if (newEmail.toLowerCase() === user.email.toLowerCase()) {
    return NextResponse.json({ error: "El nuevo email es igual al actual" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) {
    return NextResponse.json({ error: "Este email ya está en uso" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email: newEmail },
  });

  return NextResponse.json({ ok: true });
}
