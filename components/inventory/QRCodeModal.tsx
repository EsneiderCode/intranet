"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  itemName: string;
  qrCode: string; // data URL
}

export function QRCodeModal({ open, onClose, itemName, qrCode }: QRCodeModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  function handleDownload() {
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `qr-${itemName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.click();
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>QR - ${itemName}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;">
          <h2 style="margin-bottom:16px;">${itemName}</h2>
          <img src="${qrCode}" style="width:300px;height:300px;" />
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Código QR — {itemName}</DialogTitle>
        </DialogHeader>
        <div ref={printRef} className="flex flex-col items-center gap-4 py-2">
          {qrCode ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCode} alt={`QR de ${itemName}`} className="w-56 h-56" />
          ) : (
            <div className="w-56 h-56 bg-muted rounded flex items-center justify-center text-sm text-muted-foreground">
              Sin QR
            </div>
          )}
          <p className="text-sm text-muted-foreground text-center">{itemName}</p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" className="gap-2" onClick={handleDownload} disabled={!qrCode}>
            <Download className="h-4 w-4" />
            Descargar PNG
          </Button>
          <Button variant="outline" className="gap-2" onClick={handlePrint} disabled={!qrCode}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
