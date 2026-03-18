"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ItemStatusBadge } from "./ItemStatusBadge";
import { QRCodeModal } from "./QRCodeModal";
import { InventoryForm } from "./InventoryForm";
import { InventoryHistoryList } from "./InventoryHistoryList";
import { TransferRequestList } from "./TransferRequestList";
import { TransferRequestForm } from "./TransferRequestForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, QrCode, ArrowRightLeft, X, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

type Tab = "info" | "history" | "transfers";

interface ItemPhoto {
  id: string;
  url: string;
  order: number;
}

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  qrCode: string;
  status: "AVAILABLE" | "IN_USE" | "IN_REPAIR" | "DECOMMISSIONED";
  assignedToId?: string | null;
  addedById: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; firstName: string; lastName: string; avatarUrl?: string | null } | null;
  addedBy: { id: string; firstName: string; lastName: string };
  photos?: ItemPhoto[];
  isElectronic: boolean;
  checklistBrokenParts: boolean | null;
  checklistCase: boolean | null;
  checklistCasePhotoUrl: string;
  checklistCharger: boolean | null;
  checklistChargerPhotoUrl: string;
}

interface TransferRecord {
  id: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  item: { id: string; name: string; imageUrl: string; status: string };
  requestedBy: { id: string; firstName: string; lastName: string };
  toUser: { id: string; firstName: string; lastName: string };
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
}

interface InventoryItemDetailProps {
  item: InventoryItem;
  isAdmin: boolean;
  currentUserId: string;
  technicians: Technician[];
  transfers: TransferRecord[];
  canEdit: boolean;
  canTransfer: boolean;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "info", label: "Información" },
  { id: "history", label: "Historial" },
  { id: "transfers", label: "Transferencias" },
];

function ChecklistRow({ label, value }: { label: string; value: boolean | null }) {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MinusCircle className="h-4 w-4 flex-shrink-0" />
        <span>{label}: <span className="italic">No registrado</span></span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      {value ? (
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
      )}
      <span>{label}: <span className="font-medium">{value ? "Sí" : "No"}</span></span>
    </div>
  );
}

function ChecklistPhoto({ url, label, onOpen }: { url: string; label: string; onOpen: (u: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => onOpen(url)}>
      <div className="relative w-20 h-20 rounded-md border overflow-hidden">
        <Image src={url} alt={label} fill className="object-cover" />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function InventoryItemDetail({
  item,
  isAdmin,
  currentUserId,
  technicians,
  transfers,
  canEdit,
  canTransfer,
}: InventoryItemDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [qrOpen, setQrOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ItemPhoto[]>(item.photos ?? []);

  const handleDeletePhoto = useCallback(async (photoId: string) => {
    await fetch(`/api/inventory/${item.id}/photos/${photoId}`, { method: "DELETE" });
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }, [item.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/inventory">
            <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0">
              <ChevronLeft className="h-4 w-4" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{item.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <ItemStatusBadge status={item.status} />
              <span className="text-sm text-muted-foreground">
                Creado el{" "}
                {new Date(item.createdAt).toLocaleDateString("es-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4" />
            Ver QR
          </Button>
          {canTransfer && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setTransferOpen(true)}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Transferir
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative ${
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

      {/* Tab content */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: image + metadata */}
          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden border bg-muted aspect-square max-w-xs relative">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">
                  {item.name[0]}
                </div>
              )}
            </div>

            {/* Secondary photos gallery */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Fotos adicionales</p>
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative w-16 h-16 rounded-md border overflow-hidden cursor-pointer group flex-shrink-0"
                      onClick={() => setLightboxUrl(photo.url)}
                    >
                      <Image src={photo.url} alt="Foto adicional" fill className="object-cover" />
                      {canEdit && (
                        <button
                          type="button"
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(photo.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned to */}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Asignado a</p>
              {item.assignedTo ? (
                <div className="flex items-center gap-2">
                  <AvatarPrimitive.Root className="h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    <AvatarPrimitive.Image
                      src={item.assignedTo.avatarUrl ?? undefined}
                      className="h-full w-full object-cover"
                    />
                    <AvatarPrimitive.Fallback className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted">
                      {item.assignedTo.firstName[0]}
                      {item.assignedTo.lastName[0]}
                    </AvatarPrimitive.Fallback>
                  </AvatarPrimitive.Root>
                  <span className="text-sm font-medium">
                    {item.assignedTo.firstName} {item.assignedTo.lastName}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin asignar</p>
              )}
            </div>

            {/* Added by */}
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium mb-1">Agregado por</p>
              <p className="text-sm text-muted-foreground">
                {item.addedBy.firstName} {item.addedBy.lastName}
              </p>
            </div>
          </div>

          {/* Right: edit form */}
          <div className="lg:col-span-2">
            {canEdit ? (
              <InventoryForm
                mode="edit"
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                technicians={technicians}
                initialData={{
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  imageUrl: item.imageUrl,
                  status: item.status,
                  assignedToId: item.assignedToId,
                  photos,
                }}
              />
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                  <p className="text-sm">{item.name}</p>
                </div>
                {item.description && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                    <p className="text-sm">{item.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "info" && (
        <div className="rounded-lg border p-4 space-y-4">
          <p className="text-sm font-semibold">Checklist de recepción</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Broken parts */}
            <ChecklistRow
              label="Partes rotas / daños visibles"
              value={item.checklistBrokenParts}
            />
            {/* Case */}
            <ChecklistRow label="Funda / estuche incluido" value={item.checklistCase} />
            {/* Charger — only if electronic */}
            {item.isElectronic && (
              <ChecklistRow label="Cargador incluido" value={item.checklistCharger} />
            )}
          </div>
          {/* Photos */}
          {(item.checklistCasePhotoUrl || item.checklistChargerPhotoUrl) && (
            <div className="flex flex-wrap gap-3 pt-1">
              {item.checklistCasePhotoUrl && (
                <ChecklistPhoto url={item.checklistCasePhotoUrl} label="Foto funda/estuche" onOpen={setLightboxUrl} />
              )}
              {item.checklistChargerPhotoUrl && (
                <ChecklistPhoto url={item.checklistChargerPhotoUrl} label="Foto cargador" onOpen={setLightboxUrl} />
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="max-w-2xl">
          <InventoryHistoryList itemId={item.id} />
        </div>
      )}

      {activeTab === "transfers" && (
        <div className="max-w-2xl">
          <TransferRequestList transfers={transfers} />
        </div>
      )}

      {/* QR Modal */}
      <QRCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        itemName={item.name}
        qrCode={item.qrCode}
      />

      {/* Transfer Modal */}
      <Dialog open={transferOpen} onOpenChange={(o) => !o && setTransferOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar transferencia — {item.name}</DialogTitle>
          </DialogHeader>
          <TransferRequestForm
            itemId={item.id}
            technicians={technicians}
            onClose={() => setTransferOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto</DialogTitle>
          </DialogHeader>
          {lightboxUrl && (
            <div className="relative w-full aspect-video">
              <Image src={lightboxUrl} alt="Foto ampliada" fill className="object-contain rounded-md" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
