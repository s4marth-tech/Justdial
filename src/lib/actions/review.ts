"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validations/review";

export async function upsertReview(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in to leave a review." };
  }

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { businessId, rating, comment } = parsed.data;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, slug: true, status: true, ownerId: true },
  });
  if (!business || business.status !== "APPROVED") {
    return { error: "This business isn't available for reviews right now." };
  }
  if (business.ownerId === session.user.id) {
    return { error: "You can't review your own business." };
  }

  await prisma.review.upsert({
    where: { businessId_userId: { businessId, userId: session.user.id } },
    update: { rating, comment: comment || null },
    create: { businessId, userId: session.user.id, rating, comment: comment || null },
  });

  const reviews = await prisma.review.findMany({
    where: { businessId },
    select: { rating: true },
  });
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await prisma.business.update({
    where: { id: businessId },
    data: { avgRating, reviewCount: reviews.length },
  });

  revalidatePath(`/business/${business.slug}`);
  return { ok: true };
}
