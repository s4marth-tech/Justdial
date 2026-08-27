"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";
import { ImagePlus, X } from "lucide-react";
import { addBusinessMedia, deleteBusinessMedia } from "@/lib/actions/media";
import { Button } from "@/components/ui/button";

type MediaItem = { id: string; url: string };

export function BusinessMediaUpload({
  businessId,
  media,
}: {
  businessId: string;
  media: MediaItem[];
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDelete = (mediaId: string) => {
    setServerError(null);
    setPendingDeleteId(mediaId);
    startTransition(async () => {
      const result = await deleteBusinessMedia(mediaId);
      if (result?.error) setServerError(result.error);
      setPendingDeleteId(null);
    });
  };

  // CldUploadWidget throws during render (not just on open) if this isn't
  // set, which would take down the whole page — so it's only mounted once
  // Cloudinary is actually configured.
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
    return (
      <div className="flex flex-col gap-3">
        {media.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {media.map((item) => (
              <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg border">
                <Image src={item.url} alt="" fill sizes="150px" className="object-cover" />
              </div>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Photo uploads aren&apos;t set up yet — add Cloudinary credentials to enable this.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {media.map((item) => (
            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg border">
              <Image src={item.url} alt="" fill sizes="150px" className="object-cover" />
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={isPending && pendingDeleteId === item.id}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
                aria-label="Remove photo"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <CldUploadWidget
        signatureEndpoint="/api/sign-cloudinary-params"
        options={{
          multiple: true,
          maxFiles: 6,
          sources: ["local"],
          folder: "my-lads/businesses",
          clientAllowedFormats: ["png", "jpg", "jpeg", "webp"],
        }}
        onSuccess={(result) => {
          const info = result?.info;
          if (!info || typeof info === "string") return;
          setServerError(null);
          startTransition(async () => {
            const res = await addBusinessMedia({
              businessId,
              url: info.secure_url,
              publicId: info.public_id,
            });
            if (res?.error) setServerError(res.error);
          });
        }}
      >
        {({ open }) => (
          <Button type="button" variant="outline" size="sm" onClick={() => open()}>
            <ImagePlus className="size-4" />
            Add Photos
          </Button>
        )}
      </CldUploadWidget>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
    </div>
  );
}
