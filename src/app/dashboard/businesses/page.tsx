import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

export default async function BusinessesPage() {
  const session = await auth();
  if (!session?.user) return null;

  const businesses = await prisma.business.findMany({
    where: { ownerId: session.user.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Businesses</h1>
        <Button
          nativeButton={false}
          render={<Link href="/dashboard/businesses/new">Add Business</Link>}
        />
      </div>

      {businesses.length === 0 ? (
        <p className="text-muted-foreground">
          You haven&apos;t listed any businesses yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {businesses.map((business) => (
            <Card key={business.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{business.name}</CardTitle>
                  <CardDescription>
                    {business.category.name} · {business.city}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[business.status]}>
                    {business.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/dashboard/businesses/${business.id}/edit`}>Edit</Link>}
                  />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
