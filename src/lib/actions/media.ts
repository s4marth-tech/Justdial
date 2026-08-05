"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary";
import { mediaSchema } from "@/lib/validations/media";

export async function addBusinessMedia(input: unknown) {
  const parsed = mediaSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { businessId, url, publicId } = parsed.data;

  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { ownerId: true, slug: true },
  });
  if (!business) {
    return { error: "Business not found." };
  }
  if (business.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    return { error: "You don't have permission to manage this business's photos." };
  }

  await prisma.media.create({
    data: { businessId, url, publicId, type: "IMAGE" },
  });

  revalidatePath(`/dashboard/businesses/${businessId}/edit`);
  revalidatePath(`/business/${business.slug}`);
  return { ok: true };
}

export async function deleteBusinessMedia(mediaId: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: { business: { select: { id: true, ownerId: true, slug: true } } },
  });
  if (!media) {
    return { error: "Photo not found." };
  }
  if (media.business.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    return { error: "You don't have permission to remove this photo." };
  }

  await cloudinary.uploader.destroy(media.publicId).catch(() => {});
  await prisma.media.delete({ where: { id: mediaId } });

  revalidatePath(`/dashboard/businesses/${media.business.id}/edit`);
  revalidatePath(`/business/${media.business.slug}`);
  return { ok: true };
}
