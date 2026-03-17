"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  currentUrl?: string | null;
  name: string;
}

export function AvatarUpload({ currentUrl, name }: AvatarUploadProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    const MAX = 5 * 1024 * 1024;
    if (file.size > MAX) {
      setError("La imagen no puede superar 5MB");
      return;
    }

    // Instant preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setLoading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);

      const res = await fetch("/api/profile", { method: "PATCH", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Error al subir la imagen");
      }
      const { avatarUrl } = data as { avatarUrl: string };
      setPreview(avatarUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen");
      setPreview(currentUrl ?? null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <AvatarPrimitive.Root className="h-24 w-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
          <AvatarPrimitive.Image
            src={preview ?? undefined}
            alt={name}
            className="h-full w-full object-cover"
          />
          <AvatarPrimitive.Fallback className="text-2xl font-semibold text-muted-foreground">
            {initials}
          </AvatarPrimitive.Fallback>
        </AvatarPrimitive.Root>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className={cn(
            "absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#F97316] text-white flex items-center justify-center shadow-md hover:bg-orange-600 transition-colors",
            loading && "opacity-70 cursor-not-allowed"
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
      <p className="text-xs text-muted-foreground">JPG, PNG o WEBP · máx 5MB</p>
    </div>
  );
}
