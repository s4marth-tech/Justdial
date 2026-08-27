import { prisma } from "@/lib/prisma";
import { approveClaim, rejectClaim } from "@/lib/actions/claim";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

const STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export default async function AdminClaimsPage() {
  const claims = await prisma.claim.findMany({
    include: {
      business: { select: { name: true, city: true, category: { select: { name: true } } } },
      requestedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const byStatus = Object.fromEntries(
    STATUSES.map((status) => [status, claims.filter((c) => c.status === status)])
  ) as Record<(typeof STATUSES)[number], typeof claims>;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Business claims</h1>

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
                {byStatus[status].map((claim) => (
                  <Card key={claim.id}>
                    <CardHeader>
                      <CardTitle>{claim.business.name}</CardTitle>
                      <CardDescription>
                        {claim.business.category.name} · {claim.business.city} · Requested by{" "}
                        {claim.requestedBy.name} ({claim.requestedBy.email})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      {claim.note && (
                        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                          &ldquo;{claim.note}&rdquo;
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Submitted{" "}
                        {new Date(claim.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      {status === "PENDING" && (
                        <div className="flex gap-2">
                          <form action={approveClaim}>
                            <input type="hidden" name="claimId" value={claim.id} />
                            <Button type="submit" size="sm">
                              Approve
                            </Button>
                          </form>
                          <form action={rejectClaim}>
                            <input type="hidden" name="claimId" value={claim.id} />
                            <Button type="submit" size="sm" variant="destructive">
                              Reject
                            </Button>
                          </form>
                        </div>
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
