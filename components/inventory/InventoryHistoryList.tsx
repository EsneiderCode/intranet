"use client";

import { useEffect, useState } from "react";
import { Clock, User } from "lucide-react";

type HistoryAction =
  | "CREATED"
  | "UPDATED"
  | "ASSIGNED"
  | "TRANSFERRED"
  | "STATUS_CHANGED"
  | "DELETED";

interface HistoryEntry {
  id: string;
  action: HistoryAction;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  fromUser?: { id: string; firstName: string; lastName: string } | null;
  toUser?: { id: string; firstName: string; lastName: string } | null;
  performedBy: { id: string; firstName: string; lastName: string };
}

const ACTION_LABELS: Record<HistoryAction, string> = {
  CREATED: "Creado",
  UPDATED: "Actualizado",
  ASSIGNED: "Asignado",
  TRANSFERRED: "Transferido",
  STATUS_CHANGED: "Estado cambiado",
  DELETED: "Eliminado",
};

const ACTION_COLORS: Record<HistoryAction, string> = {
  CREATED: "bg-green-100 text-green-800",
  UPDATED: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-purple-100 text-purple-800",
  TRANSFERRED: "bg-orange-100 text-orange-800",
  STATUS_CHANGED: "bg-yellow-100 text-yellow-800",
  DELETED: "bg-red-100 text-red-800",
};

interface InventoryHistoryListProps {
  itemId: string;
}

export function InventoryHistoryList({ itemId }: InventoryHistoryListProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inventory/${itemId}/history`)
      .then((r) => r.json())
      .then((data) => {
        setHistory(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [itemId]);

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Cargando historial...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No hay eventos registrados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <div key={entry.id} className="flex gap-3 rounded-lg border p-3">
          <div className="mt-0.5 flex-shrink-0">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[entry.action]}`}
              >
                {ACTION_LABELS[entry.action]}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString("es-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {entry.notes && (
              <p className="text-sm text-foreground">{entry.notes}</p>
            )}
            {entry.fromUser && entry.toUser && (
              <p className="text-sm text-muted-foreground">
                De{" "}
                <span className="font-medium text-foreground">
                  {entry.fromUser.firstName} {entry.fromUser.lastName}
                </span>{" "}
                →{" "}
                <span className="font-medium text-foreground">
                  {entry.toUser.firstName} {entry.toUser.lastName}
                </span>
              </p>
            )}
            {!entry.fromUser && entry.toUser && entry.action === "ASSIGNED" && (
              <p className="text-sm text-muted-foreground">
                Asignado a{" "}
                <span className="font-medium text-foreground">
                  {entry.toUser.firstName} {entry.toUser.lastName}
                </span>
              </p>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>
                {entry.performedBy.firstName} {entry.performedBy.lastName}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
