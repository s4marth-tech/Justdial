import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { PasswordSettingsForm } from "@/components/password-settings-form";
import { NotificationSettingsForm } from "@/components/notification-settings-form";
import { DeleteAccountSection } from "@/components/delete-account-section";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, businessCount, accounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, phone: true, passwordHash: true, emailNotificationsEnabled: true },
    }),
    prisma.business.count({ where: { ownerId: session.user.id } }),
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { provider: true },
    }),
  ]);

  if (!user) redirect("/login");

  const googleLinked = accounts.some((account) => account.provider === "google");

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      <div className="flex flex-col gap-6">
        <ProfileSettingsForm name={user.name ?? ""} phone={user.phone ?? ""} />
        <PasswordSettingsForm hasPassword={!!user.passwordHash} googleLinked={googleLinked} />
        <NotificationSettingsForm initialEnabled={user.emailNotificationsEnabled} />
        <DeleteAccountSection businessCount={businessCount} />
      </div>
    </div>
  );
}
