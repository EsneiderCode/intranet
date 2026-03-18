"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SquadForm } from "./SquadForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemStatusBadge } from "@/components/inventory/ItemStatusBadge";
import {
  ChevronLeft,
  Users,
  Package,
  UserPlus,
  X,
  HardHat,
} from "lucide-react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  isActive: boolean;
}

interface SquadItem {
  id: string;
  name: string;
  status: string;
  imageUrl: string;
}

interface AvailableTechnician {
  id: string;
  firstName: string;
  lastName: string;
}

interface SquadDetailProps {
  squad: {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    members: Member[];
    items: SquadItem[];
  };
  availableTechnicians: AvailableTechnician[];
}

type Tab = "members" | "items" | "edit";

const TABS: { id: Tab; label: string }[] = [
  { id: "members", label: "Miembros" },
  { id: "items", label: "Ítems asignados" },
  { id: "edit", label: "Editar" },
];

export function SquadDetail({ squad, availableTechnicians }: SquadDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("members");
  const [members, setMembers] = useState<Member[]>(squad.members);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(squad.members.map((m) => m.id))
  );
  const [saving, setSaving] = useState(false);

  // All technicians (current members + available ones not in any squad)
  const allTechnicians = [
    ...squad.members,
    ...availableTechnicians.filter((t) => !squad.members.some((m) => m.id === t.id)),
  ].sort((a, b) => a.firstName.localeCompare(b.firstName));

  async function saveMembers() {
    setSaving(true);
    const res = await fetch(`/api/squads/${squad.id}/members`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds: Array.from(selectedIds) }),
    });

    if (res.ok) {
      const updated = await res.json();
      setMembers(updated);
      setMemberDialogOpen(false);
      router.refresh();
    }
    setSaving(false);
  }

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/squads">
            <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0">
              <ChevronLeft className="h-4 w-4" />
              Volver
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center flex-shrink-0">
              <HardHat className="h-5 w-5 text-[#1E3A5F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{squad.name}</h1>
              {squad.description && (
                <p className="text-sm text-muted-foreground">{squad.description}</p>
              )}
            </div>
          </div>
        </div>
        <span
          className={`self-start sm:self-auto inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            squad.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {squad.isActive ? "Activa" : "Inactiva"}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#1E3A5F] text-[#1E3A5F]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Members tab */}
      {activeTab === "members" && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {members.length} técnico{members.length !== 1 ? "s" : ""} en esta cuadrilla
            </p>
            <Button
              size="sm"
              className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white gap-2"
              onClick={() => {
                setSelectedIds(new Set(members.map((m) => m.id)));
                setMemberDialogOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4" />
              Gestionar miembros
            </Button>
          </div>

          {members.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sin técnicos asignados.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              {members.map((member, i) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < members.length - 1 ? "border-b" : ""
                  }`}
                >
                  <AvatarPrimitive.Root className="h-9 w-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    <AvatarPrimitive.Image
                      src={member.avatarUrl ?? undefined}
                      className="h-full w-full object-cover"
                    />
                    <AvatarPrimitive.Fallback className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted">
                      {member.firstName[0]}{member.lastName[0]}
                    </AvatarPrimitive.Fallback>
                  </AvatarPrimitive.Root>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {member.firstName} {member.lastName}
                    </p>
                  </div>
                  {!member.isActive && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Inactivo</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items tab */}
      {activeTab === "items" && (
        <div className="space-y-4 max-w-2xl">
          <p className="text-sm text-muted-foreground">
            {squad.items.length} ítem{squad.items.length !== 1 ? "s" : ""} asignado{squad.items.length !== 1 ? "s" : ""} a esta cuadrilla
          </p>

          {squad.items.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sin ítems asignados.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Asigna ítems a esta cuadrilla desde el módulo de inventario.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              {squad.items.map((item, i) => (
                <Link
                  key={item.id}
                  href={`/inventory/${item.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors ${
                    i < squad.items.length - 1 ? "border-b" : ""
                  }`}
                >
                  <div className="h-10 w-10 rounded-md overflow-hidden bg-muted flex-shrink-0 relative">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {item.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                  </div>
                  <ItemStatusBadge status={item.status as "AVAILABLE" | "IN_USE" | "IN_REPAIR" | "DECOMMISSIONED"} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit tab */}
      {activeTab === "edit" && (
        <SquadForm
          mode="edit"
          initialData={{
            id: squad.id,
            name: squad.name,
            description: squad.description,
            isActive: squad.isActive,
          }}
        />
      )}

      {/* Member management dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={(o) => !o && setMemberDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar miembros — {squad.name}</DialogTitle>
          </DialogHeader>

          {allTechnicians.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay técnicos activos disponibles.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto py-2">
              {allTechnicians.map((tech) => {
                const checked = selectedIds.has(tech.id);
                return (
                  <label
                    key={tech.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(tech.id)}
                      className="rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                    />
                    <span className="text-sm">
                      {tech.firstName} {tech.lastName}
                    </span>
                    {checked && members.some((m) => m.id === tech.id) && (
                      <span className="ml-auto text-xs text-muted-foreground">actual</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Un técnico solo puede pertenecer a una cuadrilla. Al asignarlo aquí se eliminará de su cuadrilla anterior.
          </p>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)} disabled={saving}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
              onClick={saveMembers}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar miembros"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
