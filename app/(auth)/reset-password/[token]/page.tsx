import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { APP_URL } from "@/lib/constants";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validate token server-side before rendering
  const res = await fetch(`${APP_URL}/api/auth/reset-password?token=${token}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    redirect("/login?error=token-expired");
  }

  const data = await res.json();

  return <ResetPasswordForm token={token} firstName={data.firstName} />;
}
