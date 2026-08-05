"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  profileSchema,
  passwordSchema,
  notificationPreferencesSchema,
  type ProfileFormValues,
  type PasswordFormValues,
  type NotificationPreferencesFormValues,
} from "@/lib/validations/account";

export async function updateProfile(input: ProfileFormValues) {
  const session = await auth();
  if (!session?.user) return { error: "You must be logged in." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updatePassword(input: PasswordFormValues) {
  const session = await auth();
  if (!session?.user) return { error: "You must be logged in." };

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return { error: "Account not found." };

  // Accounts that already have a password (credentials sign-up, or a Google
  // account that previously set one here) must prove they know it. Accounts
  // with no password yet (Google-only) are setting one for the first time,
  // so there's nothing to verify against.
  if (user.passwordHash) {
    if (!parsed.data.currentPassword) {
      return { error: "Enter your current password." };
    }
    const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!isValid) return { error: "Current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return { ok: true };
}

export async function updateNotificationPreferences(input: NotificationPreferencesFormValues) {
  const session = await auth();
  if (!session?.user) return { error: "You must be logged in." };

  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailNotificationsEnabled: parsed.data.emailNotificationsEnabled },
  });

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function deleteAccount() {
  const session = await auth();
  if (!session?.user) return { error: "You must be logged in." };

  const businessCount = await prisma.business.count({
    where: { ownerId: session.user.id },
  });
  if (businessCount > 0) {
    return {
      error:
        "Delete or transfer your businesses first — you can't delete your account while you still own listings.",
    };
  }

  // Leads a user submitted as a customer (not as an owner) belong to the
  // business that received them, not to this account — anonymize rather
  // than cascade-delete them.
  await prisma.$transaction([
    prisma.lead.updateMany({ where: { userId: session.user.id }, data: { userId: null } }),
    prisma.user.delete({ where: { id: session.user.id } }),
  ]);

  await signOut({ redirectTo: "/" });
}
