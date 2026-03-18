"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users, Package, HardHat } from "lucide-react";

export interface SquadRow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  _count: { members: number; items: number };
}

interface SquadTableProps {
  data: SquadRow[];
}

export function SquadTable({ data }: SquadTableProps) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<SquadRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteDialog) return;
    setDeleting(true);
    await fetch(`/api/squads/${deleteDialog.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteDialog(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/squads/new">
          <Button className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white gap-2">
            <Plus className="h-4 w-4" />
            Nueva cuadrilla
          </Button>
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <HardHat className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No hay cuadrillas creadas.</p>
          <Link href="/squads/new">
            <Button variant="outline" className="mt-4">Crear primera cuadrilla</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cuadrilla</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Técnicos</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ítems</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((squad) => (
                  <tr key={squad.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center flex-shrink-0">
                          <HardHat className="h-4 w-4 text-[#1E3A5F]" />
                        </div>
                        <div>
                          <p className="font-medium">{squad.name}</p>
                          {squad.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{squad.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{squad._count.members}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{squad._count.items}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          squad.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {squad.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/squads/${squad.id}`}>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="Gestionar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          title="Eliminar"
                          onClick={() => setDeleteDialog(squad)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {data.map((squad) => (
              <div key={squad.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HardHat className="h-4 w-4 text-[#1E3A5F]" />
                    <p className="font-medium">{squad.name}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      squad.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {squad.isActive ? "Activa" : "Inactiva"}
                  </span>
                </div>
                {squad.description && (
                  <p className="text-xs text-muted-foreground">{squad.description}</p>
                )}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{squad._count.members} técnicos</span>
                  <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{squad._count.items} ítems</span>
                </div>
                <div className="flex gap-2 justify-end">
                  <Link href={`/squads/${squad.id}`}>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Gestionar
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialog(squad)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!deleteDialog} onOpenChange={(o) => !o && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar cuadrilla</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar <span className="font-semibold">{deleteDialog?.name}</span>?
              Los técnicos y los ítems quedarán sin cuadrilla asignada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
