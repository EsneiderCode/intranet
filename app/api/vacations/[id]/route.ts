import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveVacationRequestSchema } from "@/lib/validations/vacation";
import { sendVacationStatusEmail } from "@/lib/email";
import { APP_NAME } from "@/lib/constants";
import { createNotification } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = resolveVacationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { status, adminNote } = parsed.data;

  try {
    const vacation = await prisma.vacationRequest.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!vacation) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }
    if (vacation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Solo se pueden resolver solicitudes pendientes" },
        { status: 400 }
      );
    }

    const updated = await prisma.vacationRequest.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote ?? null,
        resolvedAt: new Date(),
        resolvedById: session.user.id,
      },
    });

    // Send email notification (non-blocking)
    const startStr = vacation.startDate.toLocaleDateString("es-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const endStr = vacation.endDate.toLocaleDateString("es-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const isApproved = status === "APPROVED";

    // In-app notification (non-blocking)
    createNotification({
      userId: vacation.userId,
      type: isApproved ? "VACATION_APPROVED" : "VACATION_REJECTED",
      title: isApproved ? "Vacaciones aprobadas" : "Vacaciones rechazadas",
      message: isApproved
        ? `Tu solicitud de vacaciones del ${startStr} al ${endStr} (${vacation.workingDaysRequested} días) ha sido aprobada.`
        : `Tu solicitud de vacaciones del ${startStr} al ${endStr} ha sido rechazada.${adminNote ? ` Motivo: ${adminNote}` : ""}`,
      relatedId: id,
    }).catch(() => {});

    sendVacationStatusEmail({
      to: vacation.user.email,
      subject: `${APP_NAME} — Tu solicitud de vacaciones ha sido ${isApproved ? "aprobada" : "rechazada"}`,
      htmlBody: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1E3A5F; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
          </div>
          <div style="background: #f9f9f9; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px;">Hola, <strong>${vacation.user.firstName}</strong>.</p>
            <p>Tu solicitud de vacaciones del <strong>${startStr}</strong> al <strong>${endStr}</strong>
               (${vacation.workingDaysRequested} días laborables) ha sido
               <strong style="color: ${isApproved ? "#16a34a" : "#dc2626"}">
                 ${isApproved ? "APROBADA" : "RECHAZADA"}
               </strong>.
            </p>
            ${
              !isApproved && adminNote
                ? `<div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin-top: 12px; border-radius: 4px;">
                     <strong>Motivo:</strong> ${adminNote}
                   </div>`
                : ""
            }
          </div>
        </div>
      `,
    }).catch(() => {
      // Email failure should not fail the request
    });

    return NextResponse.json({
      ...updated,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      requestedAt: updated.requestedAt.toISOString(),
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Technician can cancel own PENDING requests; admin can delete any
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const vacation = await prisma.vacationRequest.findUnique({
      where: { id },
    });
    if (!vacation) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN") {
      if (vacation.userId !== session.user.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      if (vacation.status === "REJECTED") {
        return NextResponse.json(
          { error: "No puedes cancelar una solicitud ya rechazada" },
          { status: 400 }
        );
      }
    }

    await prisma.vacationRequest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
