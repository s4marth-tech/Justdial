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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const STATUSES = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"] as const;

const STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
};

export default async function AdminPage() {
  const businesses = await prisma.business.findMany({
    include: { category: true, owner: true },
    orderBy: { createdAt: "desc" },
  });

  const byStatus = Object.fromEntries(
    STATUSES.map((status) => [status, businesses.filter((b) => b.status === status)])
  ) as Record<(typeof STATUSES)[number], typeof businesses>;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Businesses</h1>

      <Tabs defaultValue="PENDING">
        <TabsList>
          {STATUSES.map((status) => (
            <TabsTrigger key={status} value={status}>
              {STATUS_LABELS[status]} ({byStatus[status].length})
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUSES.map((status) => (
          <TabsContent key={status} value={status}>
            {byStatus[status].length === 0 ? (
              <p className="mt-4 text-muted-foreground">Nothing here.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {byStatus[status].map((business) => (
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
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
