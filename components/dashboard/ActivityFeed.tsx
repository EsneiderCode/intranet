import { Package, ArrowLeftRight, Pencil, Trash2, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";

interface ActivityEntry {
  id: string;
  action: string;
  createdAt: string;
  notes: string | null;
  item: { id: string; name: string };
  performedBy: { firstName: string; lastName: string };
  toUser: { firstName: string; lastName: string } | null;
}

const ACTION_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  CREATED: { label: "creado", Icon: Plus, color: "text-green-500" },
  UPDATED: { label: "actualizado", Icon: Pencil, color: "text-blue-500" },
  ASSIGNED: { label: "asignado", Icon: Package, color: "text-indigo-500" },
  TRANSFERRED: { label: "transferido", Icon: ArrowLeftRight, color: "text-orange-500" },
  STATUS_CHANGED: { label: "estado cambiado", Icon: RefreshCw, color: "text-yellow-600" },
  DELETED: { label: "eliminado", Icon: Trash2, color: "text-red-500" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  activities: ActivityEntry[];
}

export function ActivityFeed({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Sin actividad reciente
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {activities.map((a) => {
        const cfg = ACTION_CONFIG[a.action] ?? ACTION_CONFIG.UPDATED;
        const Icon = cfg.Icon;
        return (
          <li key={a.id} className="flex gap-3 items-start">
            <div className={`flex-shrink-0 p-1.5 rounded-md bg-muted mt-0.5 ${cfg.color}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">
                <span className="font-medium">
                  {a.performedBy.firstName} {a.performedBy.lastName}
                </span>{" "}
                {cfg.label}{" "}
                <Link
                  href={`/inventory/${a.item.id}`}
                  className="font-medium text-[#1E3A5F] hover:underline dark:text-blue-400"
                >
                  {a.item.name}
                </Link>
                {a.toUser && (
                  <> → {a.toUser.firstName} {a.toUser.lastName}</>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(a.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
