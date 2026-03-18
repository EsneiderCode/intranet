"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemStatusBadge } from "./ItemStatusBadge";
import { QRCodeModal } from "./QRCodeModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Pencil,
  Trash2,
  QrCode,
  Plus,
} from "lucide-react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

export interface InventoryRow {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  qrCode: string;
  status: "AVAILABLE" | "IN_USE" | "IN_REPAIR" | "DECOMMISSIONED";
  assignedToId?: string | null;
  createdAt: string;
  assignedTo?: { id: string; firstName: string; lastName: string; avatarUrl?: string | null } | null;
  addedBy: { id: string; firstName: string; lastName: string };
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

interface InventoryTableProps {
  data: InventoryRow[];
  isAdmin: boolean;
  currentUserId: string;
  technicians?: Technician[];
}

const col = createColumnHelper<InventoryRow>();

const STATUS_OPTIONS = [
  { value: "ALL", label: "Todos los estados" },
  { value: "AVAILABLE", label: "Disponible" },
  { value: "IN_USE", label: "En uso" },
  { value: "IN_REPAIR", label: "En reparación" },
  { value: "DECOMMISSIONED", label: "Dado de baja" },
];

export function InventoryTable({ data, isAdmin, currentUserId, technicians = [] }: InventoryTableProps) {
  const router = useRouter();
  const ITEMS_PER_PAGE = 20;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [technicianFilter, setTechnicianFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [qrModal, setQrModal] = useState<{ open: boolean; item: InventoryRow } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: InventoryRow } | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const columns = [
    col.accessor("name", {
      header: "Ítem",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md overflow-hidden bg-muted flex-shrink-0 relative">
            {row.original.imageUrl ? (
              <Image
                src={row.original.imageUrl}
                alt={row.original.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                {row.original.name[0]}
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-sm">{row.original.name}</p>
            {row.original.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</p>
            )}
          </div>
        </div>
      ),
    }),
    col.accessor("status", {
      header: "Estado",
      cell: ({ getValue }) => <ItemStatusBadge status={getValue()} />,
    }),
    col.accessor(
      (row) =>
        row.assignedTo
          ? `${row.assignedTo.firstName} ${row.assignedTo.lastName}`
          : "Sin asignar",
      {
        id: "assignedTo",
        header: "Asignado a",
        cell: ({ row }) =>
          row.original.assignedTo ? (
            <div className="flex items-center gap-2">
              <AvatarPrimitive.Root className="h-6 w-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
                <AvatarPrimitive.Image
                  src={row.original.assignedTo.avatarUrl ?? undefined}
                  className="h-full w-full object-cover"
                />
                <AvatarPrimitive.Fallback className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted">
                  {row.original.assignedTo.firstName[0]}
                  {row.original.assignedTo.lastName[0]}
                </AvatarPrimitive.Fallback>
              </AvatarPrimitive.Root>
              <span className="text-sm">
                {row.original.assignedTo.firstName} {row.original.assignedTo.lastName}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Sin asignar</span>
          ),
      }
    ),
    col.accessor("createdAt", {
      header: "Creado",
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(getValue()).toLocaleDateString("es-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </span>
      ),
    }),
  ];

  const filteredData = useMemo(() => {
    let result = data;
    if (statusFilter !== "ALL") {
      result = result.filter((d) => d.status === statusFilter);
    }
    if (technicianFilter !== "ALL") {
      if (technicianFilter === "UNASSIGNED") {
        result = result.filter((d) => !d.assignedToId);
      } else {
        result = result.filter((d) => d.assignedToId === technicianFilter);
      }
    }
    return result;
  }, [data, statusFilter, technicianFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const q = filterValue.toLowerCase();
      return (
        row.original.name.toLowerCase().includes(q) ||
        row.original.description.toLowerCase().includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [globalFilter, statusFilter, technicianFilter]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const allRows = table.getRowModel().rows;
  const visibleRows = allRows.slice(0, visibleCount);
  const hasMore = visibleCount < allRows.length;

  async function handleDelete() {
    if (!deleteDialog) return;
    setDeleting(true);
    await fetch(`/api/inventory/${deleteDialog.item.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteDialog(null);
    router.refresh();
  }

  function canEdit(item: InventoryRow) {
    if (isAdmin) return true;
    return item.assignedToId === currentUserId;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-xs"
          />
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && technicians.length > 0 && (
            <Select onValueChange={setTechnicianFilter} value={technicianFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los técnicos</SelectItem>
                <SelectItem value="UNASSIGNED">Sin asignar</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Link href="/inventory/new">
          <Button className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Nuevo ítem
          </Button>
        </Link>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Acciones
                </th>
              </tr>
            ))}
          </thead>
          <tbody>
            {allRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No hay ítems que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        title="Ver QR"
                        onClick={() => setQrModal({ open: true, item: row.original })}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit(row.original) && (
                        <Link href={`/inventory/${row.original.id}`}>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          title="Eliminar"
                          onClick={() => setDeleteDialog({ open: true, item: row.original })}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {allRows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay resultados.</p>
        ) : (
          visibleRows.map((row) => (
            <div key={row.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0 relative">
                  {row.original.imageUrl ? (
                    <Image
                      src={row.original.imageUrl}
                      alt={row.original.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                      {row.original.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{row.original.name}</p>
                    <ItemStatusBadge status={row.original.status} />
                  </div>
                  {row.original.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {row.original.description}
                    </p>
                  )}
                </div>
              </div>

              {row.original.assignedTo && (
                <div className="flex items-center gap-2">
                  <AvatarPrimitive.Root className="h-5 w-5 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    <AvatarPrimitive.Image
                      src={row.original.assignedTo.avatarUrl ?? undefined}
                      className="h-full w-full object-cover"
                    />
                    <AvatarPrimitive.Fallback className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted">
                      {row.original.assignedTo.firstName[0]}
                    </AvatarPrimitive.Fallback>
                  </AvatarPrimitive.Root>
                  <span className="text-xs text-muted-foreground">
                    {row.original.assignedTo.firstName} {row.original.assignedTo.lastName}
                  </span>
                </div>
              )}

              <div className="flex gap-2 justify-end flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setQrModal({ open: true, item: row.original })}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QR
                </Button>
                {canEdit(row.original) && (
                  <Link href={`/inventory/${row.original.id}`}>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </Link>
                )}
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialog({ open: true, item: row.original })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Infinite scroll sentinel + count */}
      <div className="flex items-center justify-between py-2">
        <p className="text-sm text-muted-foreground">
          {visibleRows.length} de {allRows.length} ítem(s)
        </p>
        {hasMore && (
          <p className="text-xs text-muted-foreground">Desplázate para cargar más</p>
        )}
      </div>
      <div ref={sentinelRef} className="h-4" />

      {/* QR Modal */}
      {qrModal && (
        <QRCodeModal
          open={qrModal.open}
          onClose={() => setQrModal(null)}
          itemName={qrModal.item.name}
          qrCode={qrModal.item.qrCode}
        />
      )}

      {/* Delete confirm dialog */}
      <Dialog
        open={deleteDialog?.open ?? false}
        onOpenChange={(o) => !o && setDeleteDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar ítem</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar{" "}
              <span className="font-semibold">{deleteDialog?.item.name}</span>? Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(null)}
              disabled={deleting}
            >
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
