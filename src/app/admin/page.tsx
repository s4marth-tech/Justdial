import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  approveBusiness,
  rejectBusiness,
  suspendBusiness,
  reinstateBusiness,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const STATUSES = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABELS: Record<Status, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
};

const PAGE_SIZE = 20;

type AdminPageProps = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { status: statusParam, page: pageParam } = await searchParams;
  const status: Status = STATUSES.includes(statusParam as Status)
    ? (statusParam as Status)
    : "PENDING";
  const page = Math.max(1, Number(pageParam) || 1);

  // One cheap groupBy for every tab's count, instead of loading every
  // business row (474+ and growing) just to filter it into tabs client-side.
  const [counts, businesses, totalMatching] = await Promise.all([
    prisma.business.groupBy({ by: ["status"], _count: true }),
    prisma.business.findMany({
      where: { status },
      select: {
        id: true,
        name: true,
        city: true,
        category: { select: { name: true } },
        owner: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.business.count({ where: { status } }),
  ]);

  const countByStatus = Object.fromEntries(
    STATUSES.map((s) => [s, counts.find((c) => c.status === s)?._count ?? 0])
  ) as Record<Status, number>;

  const totalPages = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));

  const statusHref = (targetStatus: Status) => `/admin?status=${targetStatus}`;
  const pageHref = (targetPage: number) => `/admin?status=${status}&page=${targetPage}`;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Businesses</h1>

      <div className="mb-4 flex flex-wrap gap-1 border-b">
        {STATUSES.map((s) => (
          <Button
            key={s}
            variant={s === status ? "default" : "ghost"}
            size="sm"
            nativeButton={false}
            render={<Link href={statusHref(s)} />}
          >
            {STATUS_LABELS[s]} ({countByStatus[s]})
          </Button>
        ))}
      </div>

      {businesses.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Nothing here.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-3">
            {businesses.map((business) => (
              <Card key={business.id}>
                <CardHeader>
                  <CardTitle>{business.name}</CardTitle>
                  <CardDescription>
                    {business.category.name} · {business.city} · Owner:{" "}
                    {business.owner?.name} ({business.owner?.email})
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  {status === "PENDING" && (
                    <>
                      <form action={approveBusiness}>
                        <input type="hidden" name="businessId" value={business.id} />
                        <Button type="submit" size="sm">
                          Approve
                        </Button>
                      </form>
                      <form action={rejectBusiness}>
                        <input type="hidden" name="businessId" value={business.id} />
                        <Button type="submit" size="sm" variant="destructive">
                          Reject
                        </Button>
                      </form>
                    </>
                  )}
                  {status === "APPROVED" && (
                    <form action={suspendBusiness}>
                      <input type="hidden" name="businessId" value={business.id} />
                      <Button type="submit" size="sm" variant="destructive">
                        Suspend
                      </Button>
                    </form>
                  )}
                  {status === "SUSPENDED" && (
                    <form action={reinstateBusiness}>
                      <input type="hidden" name="businessId" value={business.id} />
                      <Button type="submit" size="sm">
                        Reinstate
                      </Button>
                    </form>
                  )}
                  {status === "REJECTED" && (
                    <form action={approveBusiness}>
                      <input type="hidden" name="businessId" value={business.id} />
                      <Button type="submit" size="sm">
                        Approve
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4 text-sm">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="underline underline-offset-4">
                  Previous
                </Link>
              ) : (
                <span className="text-muted-foreground">Previous</span>
              )}
              <span className="text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="underline underline-offset-4">
                  Next
                </Link>
              ) : (
                <span className="text-muted-foreground">Next</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
