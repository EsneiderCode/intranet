"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserStatusBadge, RoleBadge } from "./UserStatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronUp, ChevronDown, ChevronsUpDown, Pencil, UserX, UserCheck, Plus } from "lucide-react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

export interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "ADMIN" | "TECHNICIAN";
  avatarUrl?: string | null;
  state: string;
  isActive: boolean;
  createdAt: string;
}

const col = createColumnHelper<UserRow>();

const columns = [
  col.accessor((row) => `${row.firstName} ${row.lastName}`, {
    id: "name",
    header: "Usuario",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <AvatarPrimitive.Root className="h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
          <AvatarPrimitive.Image
            src={row.original.avatarUrl ?? undefined}
            alt={row.original.firstName}
            className="h-full w-full object-cover"
          />
          <AvatarPrimitive.Fallback className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted">
            {row.original.firstName[0]}{row.original.lastName[0]}
          </AvatarPrimitive.Fallback>
        </AvatarPrimitive.Root>
        <div>
          <p className="font-medium text-sm">{row.original.firstName} {row.original.lastName}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      </div>
    ),
  }),
  col.accessor("role", {
    header: "Rol",
    cell: ({ getValue }) => <RoleBadge role={getValue()} />,
  }),
  col.accessor("state", {
    header: "Estado federal",
    cell: ({ getValue }) => <span className="text-sm">{getValue() || "—"}</span>,
  }),
  col.accessor("isActive", {
    header: "Estado",
    cell: ({ getValue }) => <UserStatusBadge isActive={getValue()} />,
  }),
];

interface UserTableProps {
  data: UserRow[];
}

export function UserTable({ data }: UserTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    isActive: boolean;
  } | null>(null);
  const [toggling, setToggling] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  async function toggleActive() {
    if (!confirmDialog) return;
    setToggling(true);
    await fetch(`/api/users/${confirmDialog.userId}`, { method: "DELETE" });
    setConfirmDialog(null);
    setToggling(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input
          placeholder="Buscar por nombre o email..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Link href="/users/new">
          <Button className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white gap-2">
            <Plus className="h-4 w-4" />
            Nuevo usuario
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
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                  No hay usuarios que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/users/${row.original.id}`}>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            userId: row.original.id,
                            userName: `${row.original.firstName} ${row.original.lastName}`,
                            isActive: row.original.isActive,
                          })
                        }
                      >
                        {row.original.isActive ? (
                          <UserX className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5 text-green-600" />
                        )}
                      </Button>
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
        {table.getRowModel().rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay resultados.</p>
        ) : (
          table.getRowModel().rows.map((row) => (
            <div key={row.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AvatarPrimitive.Root className="h-10 w-10 rounded-full overflow-hidden bg-muted">
                    <AvatarPrimitive.Image src={row.original.avatarUrl ?? undefined} className="h-full w-full object-cover" />
                    <AvatarPrimitive.Fallback className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                      {row.original.firstName[0]}{row.original.lastName[0]}
                    </AvatarPrimitive.Fallback>
                  </AvatarPrimitive.Root>
                  <div>
                    <p className="font-medium">{row.original.firstName} {row.original.lastName}</p>
                    <p className="text-xs text-muted-foreground">{row.original.email}</p>
                  </div>
                </div>
                <UserStatusBadge isActive={row.original.isActive} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <RoleBadge role={row.original.role} />
                {row.original.state && (
                  <span className="text-xs text-muted-foreground">{row.original.state}</span>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Link href={`/users/${row.original.id}`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      userId: row.original.id,
                      userName: `${row.original.firstName} ${row.original.lastName}`,
                      isActive: row.original.isActive,
                    })
                  }
                >
                  {row.original.isActive ? (
                    <><UserX className="h-3.5 w-3.5 text-destructive" /> Desactivar</>
                  ) : (
                    <><UserCheck className="h-3.5 w-3.5 text-green-600" /> Activar</>
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} usuario(s) encontrado(s)
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <span className="text-sm flex items-center px-2">
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog
        open={confirmDialog?.open ?? false}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.isActive ? "Desactivar usuario" : "Activar usuario"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.isActive
                ? `¿Seguro que quieres desactivar a ${confirmDialog?.userName}? No podrá iniciar sesión.`
                : `¿Seguro que quieres activar a ${confirmDialog?.userName}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)} disabled={toggling}>
              Cancelar
            </Button>
            <Button
              variant={confirmDialog?.isActive ? "destructive" : "default"}
              onClick={toggleActive}
              disabled={toggling}
            >
              {confirmDialog?.isActive ? "Desactivar" : "Activar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
