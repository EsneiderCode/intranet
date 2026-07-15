"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ItemStatusBadge } from "./ItemStatusBadge";
import type { InventoryRow } from "./InventoryTable";
import {
  ChevronDown,
  ChevronRight,
  User,
  HardHat,
  Truck,
  MapPin,
  PackageOpen,
  ArrowRightLeft,
} from "lucide-react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

type GroupKind = "technician" | "squad" | "vehicle" | "location" | "unassigned";

interface Group {
  key: string;
  kind: GroupKind;
  label: string;
  sublabel?: string;
  avatarUrl?: string | null;
  items: InventoryRow[];
}

interface InventoryGroupedProps {
  items: InventoryRow[];
  isAdmin: boolean;
  selected: Set<string>;
  onToggleItem: (id: string) => void;
  onToggleGroup: (ids: string[], checked: boolean) => void;
  onMoveGroup: (ids: string[], label: string) => void;
}

const KIND_ORDER: Record<GroupKind, number> = {
  technician: 0,
  squad: 1,
  vehicle: 2,
  location: 3,
  unassigned: 4,
};

const KIND_ICONS: Record<GroupKind, typeof User> = {
  technician: User,
  squad: HardHat,
  vehicle: Truck,
  location: MapPin,
  unassigned: PackageOpen,
};

const KIND_LABELS: Record<GroupKind, string> = {
  technician: "Técnico",
  squad: "Cuadrilla",
  vehicle: "Vehículo",
  location: "Ubicación",
  unassigned: "",
};

export function InventoryGrouped({
  items,
  isAdmin,
  selected,
  onToggleItem,
  onToggleGroup,
  onMoveGroup,
}: InventoryGroupedProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, Group>();

    for (const item of items) {
      let key: string;
      let kind: GroupKind;
      let label: string;
      let sublabel: string | undefined;
      let avatarUrl: string | null | undefined;

      if (item.assignedTo) {
        kind = "technician";
        key = `tech:${item.assignedTo.id}`;
        label = `${item.assignedTo.firstName} ${item.assignedTo.lastName}`;
        avatarUrl = item.assignedTo.avatarUrl;
      } else if (item.squad) {
        kind = "squad";
        key = `squad:${item.squad.id}`;
        label = item.squad.name;
      } else if (item.vehicle) {
        kind = "vehicle";
        key = `vehicle:${item.vehicle.id}`;
        label = item.vehicle.name;
        sublabel = item.vehicle.plate || undefined;
      } else if (item.location) {
        kind = "location";
        key = `loc:${item.location.toLowerCase()}`;
        label = item.location;
      } else {
        kind = "unassigned";
        key = "unassigned";
        label = "Sin asignar";
      }

      const existing = map.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(key, { key, kind, label, sublabel, avatarUrl, items: [item] });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (KIND_ORDER[a.kind] !== KIND_ORDER[b.kind]) {
        return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
      }
      return a.label.localeCompare(b.label, "es");
    });
  }, [items]);

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No hay ítems que coincidan con la búsqueda.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const Icon = KIND_ICONS[group.kind];
        const isCollapsed = collapsed.has(group.key);
        const ids = group.items.map((i) => i.id);
        const allSelected = ids.every((id) => selected.has(id));

        return (
          <div key={group.key} className="rounded-lg border overflow-hidden">
            {/* Group header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b">
              <button
                type="button"
                onClick={() => toggleCollapsed(group.key)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={isCollapsed ? "Expandir" : "Colapsar"}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {isAdmin && (
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#1E3A5F] cursor-pointer"
                  checked={allSelected}
                  onChange={(e) => onToggleGroup(ids, e.target.checked)}
                  title="Seleccionar grupo"
                />
              )}

              {group.kind === "technician" && group.avatarUrl !== undefined ? (
                <AvatarPrimitive.Root className="h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  <AvatarPrimitive.Image
                    src={group.avatarUrl ?? undefined}
                    className="h-full w-full object-cover"
                  />
                  <AvatarPrimitive.Fallback className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted">
                    {group.label
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </AvatarPrimitive.Fallback>
                </AvatarPrimitive.Root>
              ) : (
                <div className="h-8 w-8 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-[#1E3A5F]" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{group.label}</p>
                <p className="text-xs text-muted-foreground">
                  {[KIND_LABELS[group.kind], group.sublabel].filter(Boolean).join(" · ") || " "}
                </p>
              </div>

              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1E3A5F]/10 text-[#1E3A5F] flex-shrink-0">
                {group.items.length} ítem(s)
              </span>

              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 flex-shrink-0"
                  onClick={() => onMoveGroup(ids, group.label)}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mover todo</span>
                </Button>
              )}
            </div>

            {/* Group items */}
            {!isCollapsed && (
              <div className="divide-y">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/inventory/${item.id}`)}
                  >
                    {isAdmin && (
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#1E3A5F] cursor-pointer flex-shrink-0"
                        checked={selected.has(item.id)}
                        onChange={() => onToggleItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <div className="h-9 w-9 rounded-md overflow-hidden bg-muted flex-shrink-0 relative">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                          {item.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                      )}
                    </div>
                    <ItemStatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
