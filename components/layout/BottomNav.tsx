"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, CalendarDays, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/constants";

interface BottomNavProps {
  role: string;
}

const navItems = [
  { href: NAV_LINKS.dashboard, label: "Panel", icon: LayoutDashboard, roles: ["ADMIN", "TECHNICIAN"] },
  { href: NAV_LINKS.inventory, label: "Inventario", icon: Package, roles: ["ADMIN", "TECHNICIAN"] },
  { href: NAV_LINKS.vacations, label: "Vacaciones", icon: CalendarDays, roles: ["ADMIN", "TECHNICIAN"] },
  { href: NAV_LINKS.users, label: "Usuarios", icon: Users, roles: ["ADMIN"] },
  { href: NAV_LINKS.reports, label: "Reportes", icon: BarChart3, roles: ["ADMIN"] },
];

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border z-40 flex items-center">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors",
              isActive
                ? "text-[#F97316]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "text-[#F97316]")} />
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
