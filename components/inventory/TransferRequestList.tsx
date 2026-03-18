"use client";

import { ArrowRight, HardHat } from "lucide-react";

interface TransferRecord {
  id: string;
  createdAt: string;
  resolvedAt?: string | null;
  item: { id: string; name: string; imageUrl: string; status: string };
  requestedBy: { id: string; firstName: string; lastName: string };
  toUser?: { id: string; firstName: string; lastName: string } | null;
  toSquad?: { id: string; name: string } | null;
}

interface TransferRequestListProps {
  transfers: TransferRecord[];
}

export function TransferRequestList({ transfers }: TransferRequestListProps) {
  if (transfers.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        Sin historial de transferencias.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {transfers.map((t) => {
        const destLabel = t.toUser
          ? `${t.toUser.firstName} ${t.toUser.lastName}`
          : t.toSquad?.name ?? "—";
        const isSquad = !t.toUser && !!t.toSquad;

        return (
          <div key={t.id} className="rounded-lg border p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>{t.requestedBy.firstName} {t.requestedBy.lastName}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              {isSquad && <HardHat className="h-3.5 w-3.5 text-[#1E3A5F] flex-shrink-0" />}
              <span>{destLabel}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(t.createdAt).toLocaleDateString("es-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
