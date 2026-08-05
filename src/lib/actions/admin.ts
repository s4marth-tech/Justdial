"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export async function approveBusiness(formData: FormData) {
  await requireAdmin();
  const businessId = formData.get("businessId");
  if (typeof businessId !== "string") return;

  await prisma.business.update({
    where: { id: businessId },
    data: { status: "APPROVED" },
  });
  revalidatePath("/admin");
}

export async function rejectBusiness(formData: FormData) {
  await requireAdmin();
  const businessId = formData.get("businessId");
  if (typeof businessId !== "string") return;

  await prisma.business.update({
    where: { id: businessId },
    data: { status: "REJECTED" },
  });
  revalidatePath("/admin");
}

export async function suspendBusiness(formData: FormData) {
  await requireAdmin();
  const businessId = formData.get("businessId");
  if (typeof businessId !== "string") return;

  const business = await prisma.business.update({
    where: { id: businessId },
    data: { status: "SUSPENDED" },
    select: { slug: true },
  });
  revalidatePath("/admin");
  revalidatePath(`/business/${business.slug}`);
}

export async function reinstateBusiness(formData: FormData) {
  await requireAdmin();
  const businessId = formData.get("businessId");
  if (typeof businessId !== "string") return;

  const business = await prisma.business.update({
    where: { id: businessId },
    data: { status: "APPROVED" },
    select: { slug: true },
  });
  revalidatePath("/admin");
  revalidatePath(`/business/${business.slug}`);
}
