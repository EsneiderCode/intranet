"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  role: string;
}

const navItems = [
  { href: NAV_LINKS.dashboard, label: "Panel principal", icon: LayoutDashboard, roles: ["ADMIN", "TECHNICIAN"] },
  { href: NAV_LINKS.inventory, label: "Inventario", icon: Package, roles: ["ADMIN", "TECHNICIAN"] },
  { href: NAV_LINKS.vacations, label: "Vacaciones", icon: CalendarDays, roles: ["ADMIN", "TECHNICIAN"] },
  { href: NAV_LINKS.users, label: "Usuarios", icon: Users, roles: ["ADMIN"] },
  { href: NAV_LINKS.reports, label: "Reportes", icon: BarChart3, roles: ["ADMIN"] },
  // { href: NAV_LINKS.settings, label: "Configuración", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 h-full bg-[#1E3A5F] text-white transition-all duration-300 z-40",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-white/10">
          <div className="w-9 h-9 bg-[#F97316] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">U</span>
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <p className="font-bold text-base leading-tight">Umtelkomd</p>
              <p className="text-xs text-blue-300 leading-tight">Gestión Interna</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors",
                      isActive
                        ? "bg-[#F97316] text-white"
                        : "text-blue-200 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                  isActive
                    ? "bg-[#F97316] text-white"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "text-blue-200 hover:text-white hover:bg-white/10 w-full",
              collapsed ? "justify-center px-0" : "justify-end"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="text-xs">Colapsar</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
