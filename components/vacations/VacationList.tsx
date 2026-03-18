"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VacationStatusBadge } from "./VacationStatusBadge";
import { cn } from "@/lib/utils";

export type VacationRequestItem = {
  id: string;
  startDate: string;
  endDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  workingDaysRequested: number;
  requestedAt: string;
  adminNote: string | null;
  description?: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  resolvedBy?: {
    firstName: string;
    lastName: string;
  } | null;
};

interface VacationListProps {
  requests: VacationRequestItem[];
  isAdmin: boolean;
  showUserName?: boolean;
  onStatusChange?: (id: string, updates: Partial<VacationRequestItem>) => void;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  if (s.toISOString().slice(0, 10) === e.toISOString().slice(0, 10)) {
    return s.toLocaleDateString("es-ES", opts);
  }
  return `${s.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} — ${e.toLocaleDateString("es-ES", opts)}`;
}

type RejectDialogState = { open: boolean; requestId: string; reason: string };
type ApproveDialogState = { open: boolean; requestId: string; userName: string; dates: string };

export function VacationList({ requests, isAdmin, showUserName = false, onStatusChange }: VacationListProps) {
  const router = useRouter();
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState>({
    open: false,
    requestId: "",
    reason: "",
  });
  const [approveDialog, setApproveDialog] = useState<ApproveDialogState>({
    open: false,
    requestId: "",
    userName: "",
    dates: "",
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    requestId: string;
    status: "PENDING" | "APPROVED";
  }>({
    open: false,
    requestId: "",
    status: "PENDING",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  async function handleApprove() {
    setIsLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/vacations/${approveDialog.requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Error al aprobar");
        return;
      }
      setApproveDialog({ open: false, requestId: "", userName: "", dates: "" });
      onStatusChange?.(approveDialog.requestId, { status: "APPROVED" });
      router.refresh();
    } catch {
      setActionError("Error de red. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectDialog.reason.trim()) return;
    setIsLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/vacations/${rejectDialog.requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", adminNote: rejectDialog.reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Error al rechazar");
        return;
      }
      setRejectDialog({ open: false, requestId: "", reason: "" });
      onStatusChange?.(rejectDialog.requestId, { status: "REJECTED", adminNote: rejectDialog.reason });
      router.refresh();
    } catch {
      setActionError("Error de red. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    setIsLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/vacations/${deleteDialog.requestId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Error al cancelar");
        return;
      }
      setDeleteDialog({ open: false, requestId: "", status: "PENDING" });
      router.refresh();
    } catch {
      setActionError("Error de red. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
        No hay solicitudes registradas.
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards / Desktop table */}
      <div className="space-y-3 md:hidden">
        {requests.map((r) => (
          <div
            key={r.id}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            {showUserName && r.user && (
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {r.user.firstName} {r.user.lastName}
              </p>
            )}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">
                  {formatDateRange(r.startDate, r.endDate)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {r.workingDaysRequested} día{r.workingDaysRequested !== 1 ? "s" : ""} laborable
                  {r.workingDaysRequested !== 1 ? "s" : ""}
                </p>
              </div>
              <VacationStatusBadge status={r.status} />
            </div>
            {r.description && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                {r.description}
              </p>
            )}
            {r.adminNote && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                &ldquo;{r.adminNote}&rdquo;
              </p>
            )}
            {isAdmin && r.status === "PENDING" && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                  onClick={() =>
                    setApproveDialog({
                      open: true,
                      requestId: r.id,
                      userName: r.user ? `${r.user.firstName} ${r.user.lastName}` : "el técnico",
                      dates: formatDateRange(r.startDate, r.endDate),
                    })
                  }
                >
                  <Check className="h-3 w-3 mr-1" /> Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 h-8 text-xs"
                  onClick={() =>
                    setRejectDialog({ open: true, requestId: r.id, reason: "" })
                  }
                >
                  <X className="h-3 w-3 mr-1" /> Rechazar
                </Button>
              </div>
            )}
            {!isAdmin && r.status !== "REJECTED" && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={() =>
                  setDeleteDialog({
                    open: true,
                    requestId: r.id,
                    status: r.status as "PENDING" | "APPROVED",
                  })
                }
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {r.status === "APPROVED" ? "Cancelar vacaciones" : "Cancelar solicitud"}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {showUserName && (
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                  Técnico
                </th>
              )}
              <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Fechas
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Días lab.
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Estado
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Solicitado
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Descripción
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Nota admin
              </th>
              {(isAdmin || requests.some((r) => r.status !== "REJECTED")) && (
                <th className="py-3 px-4" />
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {requests.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {showUserName && (
                  <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                    {r.user ? `${r.user.firstName} ${r.user.lastName}` : "—"}
                  </td>
                )}
                <td className="py-3 px-4 text-gray-900 dark:text-white whitespace-nowrap">
                  {formatDateRange(r.startDate, r.endDate)}
                </td>
                <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
                  {r.workingDaysRequested}
                </td>
                <td className="py-3 px-4">
                  <VacationStatusBadge status={r.status} />
                </td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(r.requestedAt).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-300 max-w-[180px]">
                  {r.description || <span className="text-gray-300">—</span>}
                </td>
                <td
                  className={cn(
                    "py-3 px-4 text-xs max-w-[200px]",
                    r.adminNote ? "text-gray-600 dark:text-gray-400 italic" : "text-gray-300"
                  )}
                >
                  {r.adminNote ?? "—"}
                </td>
                <td className="py-3 px-4">
                  {isAdmin && r.status === "PENDING" && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs"
                        onClick={() =>
                          setApproveDialog({
                            open: true,
                            requestId: r.id,
                            userName: r.user
                              ? `${r.user.firstName} ${r.user.lastName}`
                              : "el técnico",
                            dates: formatDateRange(r.startDate, r.endDate),
                          })
                        }
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          setRejectDialog({ open: true, requestId: r.id, reason: "" })
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {!isAdmin && r.status !== "REJECTED" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                      title={
                        r.status === "APPROVED" ? "Cancelar vacaciones aprobadas" : "Cancelar solicitud"
                      }
                      onClick={() =>
                        setDeleteDialog({
                          open: true,
                          requestId: r.id,
                          status: r.status as "PENDING" | "APPROVED",
                        })
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approve Dialog */}
      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) => {
          if (!open) setApproveDialog({ open: false, requestId: "", userName: "", dates: "" });
          setActionError("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aprobar solicitud de vacaciones</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Aprobar las vacaciones de{" "}
            <strong className="text-gray-900 dark:text-white">{approveDialog.userName}</strong>?
            <br />
            <span className="text-gray-500">{approveDialog.dates}</span>
          </p>
          {actionError && (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setApproveDialog({ open: false, requestId: "", userName: "", dates: "" })
              }
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={isLoading}
            >
              {isLoading ? "Aprobando..." : "Sí, aprobar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog — reason is required */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => {
          if (!open) setRejectDialog({ open: false, requestId: "", reason: "" });
          setActionError("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar solicitud de vacaciones</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Debes indicar el motivo del rechazo. El técnico recibirá una notificación.
            </p>
            <div className="space-y-2">
              <Label htmlFor="rejectReason">
                Motivo <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="rejectReason"
                rows={3}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] dark:focus:ring-blue-400 resize-none"
                placeholder="Ej. Período de alta demanda, conflicto con otro técnico..."
                value={rejectDialog.reason}
                onChange={(e) =>
                  setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))
                }
              />
            </div>
            {actionError && (
              <Alert variant="destructive">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, requestId: "", reason: "" })}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isLoading || !rejectDialog.reason.trim()}
            >
              {isLoading ? "Rechazando..." : "Rechazar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel (technician) Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, requestId: "", status: "PENDING" });
          setActionError("");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {deleteDialog.status === "APPROVED"
                ? "Cancelar vacaciones aprobadas"
                : "Cancelar solicitud"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {deleteDialog.status === "APPROVED" ? (
              <>
                Estas vacaciones ya fueron <strong>aprobadas</strong>. ¿Seguro que quieres
                cancelarlas? Los días se devolverán a tu saldo disponible.
              </>
            ) : (
              "¿Estás seguro de que quieres cancelar esta solicitud? Esta acción no se puede deshacer."
            )}
          </p>
          {actionError && (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, requestId: "", status: "PENDING" })}
              disabled={isLoading}
            >
              No, mantener
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading
                ? "Cancelando..."
                : deleteDialog.status === "APPROVED"
                ? "Sí, cancelar vacaciones"
                : "Sí, cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
