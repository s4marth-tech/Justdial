"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verificationSubmissionSchema } from "@/lib/verification/submission";

export async function submitVerification(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in to submit verification." };
  }

  const parsed = verificationSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { businessId, answers } = parsed.data;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true, verificationStatus: true },
  });
  if (!business) {
    return { error: "Business not found." };
  }
  if (business.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    return { error: "You don't have permission to verify this business." };
  }
  if (business.verificationStatus === "VERIFIED") {
    return { error: "This business is already verified." };
  }

  // Guard against duplicates: a business with a submission already pending
  // review can't submit again. Scoring/decisioning happens later, by an
  // admin — this action only ever creates a PENDING row.
  const existingPending = await prisma.verificationSubmission.findFirst({
    where: { businessId, status: "PENDING" },
  });
  if (existingPending) {
    return { error: "A verification submission is already pending review for this business." };
  }

  await prisma.verificationSubmission.create({
    data: {
      businessId,
      answers,
      status: "PENDING",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/businesses");
  revalidatePath(`/dashboard/businesses/${businessId}/verify`);
  return { ok: true };
}
