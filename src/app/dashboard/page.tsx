import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { updateLeadStatus } from "@/lib/actions/lead";
import {
  TYPE_LABELS,
  TYPE_ICONS,
  STATUS_LABELS,
  STATUS_VARIANT,
  SOURCE_LABELS,
} from "@/lib/lead-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const BUSINESS_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

// Home shows a bounded preview of what needs a response, not the full
// inbox — the full, filterable list lives at /dashboard/leads.
const RECENT_PENDING_LIMIT = 8;
const RECENT_BUSINESS_LIMIT = 3;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const ownerId = session.user.id;

  const businesses = await prisma.business.findMany({
    where: { ownerId },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  if (businesses.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">List your first business to get started</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Once it&apos;s approved, customer enquiries will show up right here.
          </p>
          <Button
            className="mt-4"
            nativeButton={false}
            render={<Link href="/dashboard/businesses/new">Add Business</Link>}
          />
        </div>
      </div>
    );
  }

  // Scopes every lead query to businesses this owner actually owns.
  const scopeWhere: Prisma.LeadWhereInput = { business: { ownerId } };
  const weekCutoff = daysAgo(7);
  const monthCutoff = daysAgo(30);

  const [pendingLeads, pendingCount, weekCount, monthCount] = await Promise.all([
    prisma.lead.findMany({
      where: { ...scopeWhere, status: "NEW" },
      include: { business: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: RECENT_PENDING_LIMIT,
    }),
    prisma.lead.count({ where: { ...scopeWhere, status: "NEW" } }),
    prisma.lead.count({ where: { ...scopeWhere, createdAt: { gte: weekCutoff } } }),
    prisma.lead.count({ where: { ...scopeWhere, createdAt: { gte: monthCutoff } } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      <Card className="mb-6">
        <CardContent className="grid grid-cols-3 gap-4 pt-6">
          <div>
            <p className="text-2xl font-semibold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Needs a response</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{weekCount}</p>
            <p className="text-xs text-muted-foreground">This week</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{monthCount}</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Needs attention</h2>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/leads">View all leads</Link>}
          />
        </div>

        {pendingLeads.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No pending enquiries — you&apos;re all caught up.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingLeads.map((lead) => {
              const TypeIcon = TYPE_ICONS[lead.type];
              return (
                <Card key={lead.id}>
                  <CardContent className="flex flex-col gap-3 pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          <TypeIcon className="size-3.5" />
                          {TYPE_LABELS[lead.type]}
                        </Badge>
                        <Badge variant={STATUS_VARIANT[lead.status]}>
                          {STATUS_LABELS[lead.status]}
                        </Badge>
                        {lead.source === "BROADCAST" && (
                          <Badge variant="secondary">{SOURCE_LABELS[lead.source]}</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>

                    <div className="text-sm">
                      <p className="font-medium">{lead.name}</p>
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-muted-foreground hover:underline"
                      >
                        {lead.phone}
                      </a>
                      {lead.message && (
                        <p className="mt-1 text-muted-foreground">{lead.message}</p>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">For {lead.business.name}</p>

                    <form action={updateLeadStatus} className="flex items-center gap-2">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <input type="hidden" name="status" value="CONTACTED" />
                      <Button type="submit" size="sm" variant="outline">
                        Mark as contacted
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              );
            })}
            {pendingCount > RECENT_PENDING_LIMIT && (
              <p className="text-center text-sm text-muted-foreground">
                +{pendingCount - RECENT_PENDING_LIMIT} more pending —{" "}
                <Link href="/dashboard/leads?status=NEW" className="underline underline-offset-4">
                  view all
                </Link>
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your businesses</h2>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/businesses">Manage businesses</Link>}
          />
        </div>
        <div className="flex flex-col gap-3">
          {businesses.slice(0, RECENT_BUSINESS_LIMIT).map((business) => (
            <Card key={business.id}>
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div>
                  <CardTitle className="text-base">{business.name}</CardTitle>
                  <CardDescription>
                    {business.category.name} · {business.city}
                  </CardDescription>
                </div>
                <Badge variant={BUSINESS_STATUS_VARIANT[business.status]}>
                  {business.status}
                </Badge>
              </CardHeader>
            </Card>
          ))}
          {businesses.length > RECENT_BUSINESS_LIMIT && (
            <p className="text-center text-sm text-muted-foreground">
              +{businesses.length - RECENT_BUSINESS_LIMIT} more —{" "}
              <Link href="/dashboard/businesses" className="underline underline-offset-4">
                view all
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
