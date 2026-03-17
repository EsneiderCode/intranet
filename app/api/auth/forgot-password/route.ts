import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendResetPasswordEmail } from "@/lib/email";
import { rateLimit, getIp } from "@/lib/rate-limit";
import crypto from "crypto";

// POST /api/auth/forgot-password — genera token y envía email de reset
// Rate limit: 5 intentos por IP por hora
export async function POST(req: NextRequest) {
  const rl = rateLimit(`forgot-password:${getIp(req)}`, 5, 60 * 60 * 1000);
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

  const { email } = body as { email?: string };

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  // Siempre responder con éxito para no revelar si el email existe
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, firstName: true, email: true, isActive: true },
  });

  if (user && user.isActive) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas

    await prisma.user.update({
      where: { id: user.id },
      data: { inviteToken: token, inviteTokenExpiry: expiry },
    });

    sendResetPasswordEmail({
      to: user.email,
      firstName: user.firstName,
      token,
    }).catch((err) => console.error("[forgot-password] email error:", err));
  }

  return NextResponse.json({
    message: "Si ese email existe en el sistema, recibirás un enlace para restablecer tu contraseña.",
  });
}
