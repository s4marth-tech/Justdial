import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { PasswordSettingsForm } from "@/components/password-settings-form";
import { NotificationSettingsForm } from "@/components/notification-settings-form";
import { DeleteAccountSection } from "@/components/delete-account-section";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const CLAIM_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

// The account-management equivalent of /dashboard/settings, but reachable by
// every logged-in role — not just BUSINESS_OWNER/ADMIN, who already have a
// settings tab inside /dashboard. Plain customers had no account page at
// all before this.
export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, businessCount, accounts, claims] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, phone: true, passwordHash: true, emailNotificationsEnabled: true },
    }),
    prisma.business.count({ where: { ownerId: session.user.id } }),
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { provider: true },
    }),
    prisma.claim.findMany({
      where: { requestedByUserId: session.user.id },
      include: { business: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) redirect("/login");

  const googleLinked = accounts.some((account) => account.provider === "google");

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Your account</h1>
      <div className="flex flex-col gap-6">
        <ProfileSettingsForm name={user.name ?? ""} phone={user.phone ?? ""} />
        <PasswordSettingsForm hasPassword={!!user.passwordHash} googleLinked={googleLinked} />
        <NotificationSettingsForm initialEnabled={user.emailNotificationsEnabled} />

        {claims.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your business claims</CardTitle>
              <CardDescription>
                Businesses you&apos;ve requested to take ownership of.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <Link
                    href={`/business/${claim.business.slug}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {claim.business.name}
                  </Link>
                  <Badge variant={CLAIM_STATUS_VARIANT[claim.status]}>{claim.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <DeleteAccountSection businessCount={businessCount} />
      </div>
    </div>
  );
}
