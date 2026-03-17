import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Fetch fresh avatarUrl from DB so navbar reflects changes without re-login
  const freshUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });

  const navbarUser = {
    ...session.user,
    avatarUrl: freshUser?.avatarUrl ?? undefined,
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — desktop only */}
      <Sidebar role={session.user.role} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Top navbar */}
        <Navbar user={navbarUser} />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav role={session.user.role} />
    </div>
  );
}
