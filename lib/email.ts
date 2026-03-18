import { APP_NAME, APP_URL } from "./constants";

interface SendInviteEmailParams {
  to: string;
  firstName: string;
  token: string;
}

interface SendNotificationEmailParams {
  to: string;
  firstName: string;
  subject: string;
  htmlBody: string;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  // Resend requires a verified domain. Use onboarding@resend.dev for testing.
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  // Always log in dev so the link is visible regardless of Resend config
  if (process.env.NODE_ENV !== "production") {
    console.log("\n========== EMAIL ==========");
    console.log(`To: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log(`Body:\n${params.html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()}`);
    console.log("===========================\n");
  }

  if (!apiKey) return;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

export async function sendInviteEmail({
  to,
  firstName,
  token,
}: SendInviteEmailParams): Promise<void> {
  const link = `${APP_URL}/set-password/${token}`;

  await sendEmail({
    to,
    subject: `Bienvenido a ${APP_NAME} — Activa tu cuenta`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1E3A5F; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
        </div>
        <div style="background: #f9f9f9; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #111827;">Hola, <strong>${firstName}</strong>.</p>
          <p style="color: #374151;">Tu cuenta en ${APP_NAME} ha sido creada. Haz clic en el botón de abajo para establecer tu contraseña y activar tu cuenta.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}"
               style="background: #F97316; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Activar mi cuenta
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Este enlace expira en <strong>48 horas</strong>.</p>
          <p style="color: #9ca3af; font-size: 12px; word-break: break-all;">Si el botón no funciona, copia este enlace: ${link}</p>
        </div>
      </div>
    `,
  });
}

export async function sendResetPasswordEmail({
  to,
  firstName,
  token,
}: SendInviteEmailParams): Promise<void> {
  const link = `${APP_URL}/reset-password/${token}`;

  await sendEmail({
    to,
    subject: `${APP_NAME} — Restablecer contraseña`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1E3A5F; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
        </div>
        <div style="background: #f9f9f9; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #111827;">Hola, <strong>${firstName}</strong>.</p>
          <p style="color: #374151;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}"
               style="background: #F97316; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Restablecer contraseña
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Este enlace expira en <strong>2 horas</strong>. Si no solicitaste este cambio, ignora este email.</p>
          <p style="color: #9ca3af; font-size: 12px; word-break: break-all;">Si el botón no funciona, copia este enlace: ${link}</p>
        </div>
      </div>
    `,
  });
}

export async function sendVacationStatusEmail({
  to,
  subject,
  htmlBody,
}: Omit<SendNotificationEmailParams, "firstName">): Promise<void> {
  await sendEmail({ to, subject, html: htmlBody });
}

export async function sendNewVacationRequestEmail({
  to,
  technicianName,
  startDate,
  endDate,
  workingDays,
  vacationsUrl,
}: {
  to: string;
  technicianName: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  vacationsUrl: string;
}): Promise<void> {
  await sendEmail({
    to,
    subject: `${APP_NAME} — Nueva solicitud de vacaciones de ${technicianName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1E3A5F; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
        </div>
        <div style="background: #f9f9f9; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #111827;">Nueva solicitud de vacaciones pendiente de aprobación.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Técnico</td><td style="padding: 8px 0; font-weight: bold; color: #111827;">${technicianName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Desde</td><td style="padding: 8px 0; color: #111827;">${startDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Hasta</td><td style="padding: 8px 0; color: #111827;">${endDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Días laborables</td><td style="padding: 8px 0; color: #111827;">${workingDays}</td></tr>
          </table>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${vacationsUrl}"
               style="background: #1E3A5F; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Revisar solicitud
            </a>
          </div>
        </div>
      </div>
    `,
  });
}
