"use client";

import { cn } from "@/lib/utils";

type VacationStatus = "PENDING" | "APPROVED" | "REJECTED";

const statusConfig: Record<VacationStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  APPROVED: {
    label: "Aprobada",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  REJECTED: {
    label: "Rechazada",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
};

interface VacationStatusBadgeProps {
  status: VacationStatus;
  className?: string;
}

export function VacationStatusBadge({ status, className }: VacationStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
