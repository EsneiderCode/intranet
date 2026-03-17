import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export default async function SetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SetPasswordForm token={token} />;
}
