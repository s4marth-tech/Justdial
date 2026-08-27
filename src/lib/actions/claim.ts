"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { claimSchema } from "@/lib/validations/claim";
import { notifyClaimOutcome } from "@/lib/notify";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export async function createClaim(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in to claim a business." };
  }

  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { businessId, note } = parsed.data;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, slug: true, status: true, ownerId: true },
  });
  if (!business || business.status !== "APPROVED") {
    return { error: "This business isn't available to claim right now." };
  }
  if (business.ownerId) {
    return { error: "This business already has an owner." };
  }

  // Blocks a second submission while one's already pending — the approval
  // path below is also defensive about this (auto-rejects siblings in the
  // same transaction), so this check only has to catch the common case,
  // not close every race by itself.
  const existingPending = await prisma.claim.findFirst({
    where: { businessId, status: "PENDING" },
  });
  if (existingPending) {
    return { error: "A claim is already pending review for this business." };
  }

  await prisma.claim.create({
    data: {
      businessId,
      requestedByUserId: session.user.id,
      note: note || null,
    },
  });

  revalidatePath(`/business/${business.slug}`);
  revalidatePath("/admin/claims");
  return { ok: true };
}

export async function approveClaim(formData: FormData) {
  await requireAdmin();
  const claimId = formData.get("claimId");
  if (typeof claimId !== "string") return;

  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      business: { select: { id: true, slug: true, name: true, ownerId: true } },
      requestedBy: { select: { id: true, email: true, name: true, role: true } },
    },
  });
  if (!claim || claim.status !== "PENDING") return;
  if (claim.business.ownerId) return; // already claimed via another path — nothing to do

  // Read before the transaction so we know who to notify afterward; the
  // transaction re-checks status: "PENDING" on the actual update, so a
  // claim that got resolved in between this read and the transaction is
  // simply skipped rather than double-processed.
  const otherPending = await prisma.claim.findMany({
    where: { businessId: claim.businessId, status: "PENDING", id: { not: claim.id } },
    include: { requestedBy: { select: { email: true, name: true } } },
  });

  await prisma.$transaction(async (tx) => {
    const businessUpdate = await tx.business.updateMany({
      where: { id: claim.businessId, ownerId: null },
      data: { ownerId: claim.requestedByUserId },
    });
    if (businessUpdate.count !== 1) {
      throw new Error("Business was claimed by someone else before this could be approved.");
    }

    const claimUpdate = await tx.claim.updateMany({
      where: { id: claim.id, status: "PENDING" },
      data: { status: "APPROVED" },
    });
    if (claimUpdate.count !== 1) {
      throw new Error("Claim was already resolved.");
    }

    // The dashboard layout gates on role, not just ownerId — a claimant who
    // signed up as a plain customer needs promoting or they'd be redirected
    // away from /dashboard despite now owning a business.
    if (claim.requestedBy.role === "USER") {
      await tx.user.update({ where: { id: claim.requestedByUserId }, data: { role: "BUSINESS_OWNER" } });
    }

    if (otherPending.length > 0) {
      await tx.claim.updateMany({
        where: { id: { in: otherPending.map((c) => c.id) }, status: "PENDING" },
        data: { status: "REJECTED" },
      });
    }
  });

  await notifyClaimOutcome({
    claimantEmail: claim.requestedBy.email,
    claimantName: claim.requestedBy.name,
    businessName: claim.business.name,
    businessSlug: claim.business.slug,
    outcome: "approved",
  });

  for (const other of otherPending) {
    await notifyClaimOutcome({
      claimantEmail: other.requestedBy.email,
      claimantName: other.requestedBy.name,
      businessName: claim.business.name,
      businessSlug: claim.business.slug,
      outcome: "rejectedSuperseded",
    });
  }

  revalidatePath("/admin/claims");
  revalidatePath(`/business/${claim.business.slug}`);
  revalidatePath("/dashboard/businesses");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
}

export async function rejectClaim(formData: FormData) {
  await requireAdmin();
  const claimId = formData.get("claimId");
  if (typeof claimId !== "string") return;

  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      business: { select: { slug: true, name: true } },
      requestedBy: { select: { email: true, name: true } },
    },
  });
  if (!claim || claim.status !== "PENDING") return;

  const updated = await prisma.claim.updateMany({
    where: { id: claim.id, status: "PENDING" },
    data: { status: "REJECTED" },
  });
  if (updated.count !== 1) return;

  await notifyClaimOutcome({
    claimantEmail: claim.requestedBy.email,
    claimantName: claim.requestedBy.name,
    businessName: claim.business.name,
    businessSlug: claim.business.slug,
    outcome: "rejected",
  });

  revalidatePath("/admin/claims");
}
