"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useConfirm, useToast } from "@/components/ui/feedback";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;

/**
 * Center-crops to a square and scales to 512px so large phone photos fit the
 * 2 MB storage limit. GIFs are uploaded as-is (to keep animation).
 */
async function prepareImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size
  );
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.9)
  );
  if (!blob) return file;
  return new File([blob], "avatar.webp", { type: "image/webp" });
}

export function AvatarUploader({
  name,
  initialUrl,
}: {
  name: string;
  initialUrl: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  async function onPick(file: File | null) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("That isn't an image", "Choose a JPG, PNG, WebP or GIF file.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast.error("Image too large", "Choose a picture under 10 MB.");
      return;
    }
    setBusy("upload");
    try {
      const prepared = await prepareImage(file);
      const form = new FormData();
      form.append("file", prepared);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setUrl(json.avatar_url as string);
      toast.success("Profile picture updated");
      router.refresh();
    } catch (e) {
      toast.error("Couldn't update picture", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  async function onRemove() {
    const ok = await confirm({
      title: "Remove your profile picture?",
      message: "Your initials will be shown instead.",
      confirmLabel: "Remove picture",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("remove");
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Remove failed");
      setUrl(null);
      toast.success("Profile picture removed");
      router.refresh();
    } catch (e) {
      toast.error("Couldn't remove picture", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative">
        <Avatar src={url} name={name || "User"} size="xl" className="ring-4 ring-slate-100" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!!busy}
          aria-label="Change profile picture"
          className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-pp-primary text-white ring-4 ring-white hover:bg-slate-700 disabled:opacity-60"
        >
          <Camera className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="text-center sm:text-left">
        <p className="font-semibold">Profile picture</p>
        <p className="text-sm text-pp-muted">
          JPG, PNG, WebP or GIF. We crop it to a square for you.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!!busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-pp-accent px-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Camera className="h-4 w-4" aria-hidden />
            {busy === "upload" ? "Uploading…" : url ? "Change picture" : "Upload picture"}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => void onRemove()}
              disabled={!!busy}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-pp-border bg-white px-3 text-sm font-semibold text-red-600 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {busy === "remove" ? "Removing…" : "Remove"}
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0] || null)}
      />
    </div>
  );
}
