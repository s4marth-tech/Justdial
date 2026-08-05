"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { businessSchema, type BusinessFormValues } from "@/lib/validations/business";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base: string) {
  const root = base || "business";
  let slug = root;
  let suffix = 1;
  while (await prisma.business.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${root}-${suffix}`;
  }
  return slug;
}

export async function createBusiness(input: BusinessFormValues) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "BUSINESS_OWNER" && session.user.role !== "ADMIN")
  ) {
    return { error: "You must be a business owner to add a listing." };
  }

  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, categoryId, description, phone, whatsapp, email, website, addressLine, city, state, pincode, latitude, longitude } =
    parsed.data;

  const slug = await uniqueSlug(slugify(name));

  const business = await prisma.business.create({
    data: {
      name,
      slug,
      categoryId,
      description: description || undefined,
      phone,
      whatsapp: whatsapp || undefined,
      email: email || undefined,
      website: website || undefined,
      addressLine,
      city,
      state,
      pincode,
      latitude,
      longitude,
      ownerId: session.user.id,
      status: "PENDING",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/businesses");
  // Straight to the edit page rather than the businesses list, so the owner
  // can add photos immediately without an extra click back in.
  redirect(`/dashboard/businesses/${business.id}/edit`);
}

export async function updateBusiness(businessId: string, input: BusinessFormValues) {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  const existing = await prisma.business.findUnique({
    where: { id: businessId },
    select: { ownerId: true, slug: true },
  });
  if (!existing) {
    return { error: "Business not found." };
  }
  if (existing.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    return { error: "You don't have permission to edit this business." };
  }

  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, categoryId, description, phone, whatsapp, email, website, addressLine, city, state, pincode, latitude, longitude } =
    parsed.data;

  // Slug is deliberately left unchanged even if the name changes, so the
  // business's URL never breaks. Optional fields use `|| null` (not
  // `undefined`) so that clearing one in the form actually clears it —
  // Prisma's `update` treats an `undefined` value as "leave unchanged".
  await prisma.business.update({
    where: { id: businessId },
    data: {
      name,
      categoryId,
      description: description || null,
      phone,
      whatsapp: whatsapp || null,
      email: email || null,
      website: website || null,
      addressLine,
      city,
      state,
      pincode,
      latitude,
      longitude,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/businesses");
  revalidatePath(`/business/${existing.slug}`);
  redirect("/dashboard/businesses");
}
