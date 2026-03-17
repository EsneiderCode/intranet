import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { TechnicianDashboard } from "@/components/dashboard/TechnicianDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel principal</h1>
        <p className="text-muted-foreground">
          Bienvenido, {session.user.name}
        </p>
      </div>

      {isAdmin ? <AdminDashboard /> : <TechnicianDashboard />}
    </div>
  );
}
