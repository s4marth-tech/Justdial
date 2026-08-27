import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { updateLeadStatus } from "@/lib/actions/lead";
import { TYPE_LABELS, TYPE_ICONS, STATUS_LABELS, STATUS_VARIANT } from "@/lib/lead-labels";
import { LeadStatus } from "@/generated/prisma/enums";
import { LAD_CATEGORY_SLUGS } from "@/lib/categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = Object.values(LeadStatus);
const PAGE_SIZE = 50;

type AdminLeadsPageProps = {
  searchParams: Promise<{
    name?: string;
    city?: string;
    category?: string;
    page?: string;
  }>;
};

export default async function AdminLeadsPage({ searchParams }: AdminLeadsPageProps) {
  const { name, city, category, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  // Unclaimed-only, scoped once and reused for both the filtered list and
  // its count — same shape as how the owner leads page scopes to ownerId.
  const scopeWhere: Prisma.LeadWhereInput = {
    business: {
      ownerId: null,
      ...(name ? { name: { contains: name, mode: "insensitive" } } : {}),
      ...(city && city !== "all" ? { city } : {}),
      ...(category && category !== "all" ? { category: { slug: category } } : {}),
    },
  };

  const [
    leads,
    totalMatching,
    totalLeadsEver,
    totalUnclaimedBusinesses,
    businessesWaiting,
    cities,
    categories,
  ] = await Promise.all([
    prisma.lead.findMany({
      where: scopeWhere,
      include: { business: { select: { name: true, city: true, category: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.lead.count({ where: scopeWhere }),
    // Unfiltered — drives the "no leads at all yet" vs "no leads match
    // these filters" distinction, same two-tier empty state as the owner
    // dashboard.
    prisma.lead.count({ where: { business: { ownerId: null } } }),
    prisma.business.count({ where: { ownerId: null } }),
    // "Waiting" = has a NEW (unhandled) lead — the number an admin actually
    // needs to triage, not just "has ever gotten a lead."
    prisma.business.count({ where: { ownerId: null, leads: { some: { status: "NEW" } } } }),
    prisma.business.findMany({
      where: { ownerId: null },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    }),
    prisma.category.findMany({
      where: { slug: { in: [...LAD_CATEGORY_SLUGS] } },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));
  const hasAnyLeadsEver = totalLeadsEver > 0;

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    params.set("page", String(targetPage));
    return `/admin/leads?${params.toString()}`;
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Leads on unclaimed businesses</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {totalUnclaimedBusinesses} unclaimed businesses ·{" "}
        <span className={businessesWaiting > 0 ? "font-medium text-foreground" : undefined}>
          {businessesWaiting} {businessesWaiting === 1 ? "has" : "have"} a lead waiting
        </span>
      </p>

      <form
        method="GET"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Business name</span>
          <Input name="name" defaultValue={name ?? ""} placeholder="Search by business name" className="w-full" />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">City</span>
          <Select name="city" defaultValue={city ?? "all"}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c.city} value={c.city}>
                  {c.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Category</span>
          <Select name="category" defaultValue={category ?? "all"}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" size="sm">
          Filter
        </Button>
      </form>

      {!hasAnyLeadsEver ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No leads yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Leads show up here when a customer enquires, requests a callback, or views a phone
            number on an unclaimed business listing.
          </p>
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No leads match these filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different business name, or clear the city/category filter.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {leads.map((lead) => {
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
                        <Badge variant={STATUS_VARIANT[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
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
                      <a href={`tel:${lead.phone}`} className="text-muted-foreground hover:underline">
                        {lead.phone}
                      </a>
                      {lead.message && <p className="mt-1 text-muted-foreground">{lead.message}</p>}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      For {lead.business.name} · {lead.business.category.name} · {lead.business.city}
                    </p>

                    <form action={updateLeadStatus} className="flex items-center gap-2">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <select
                        name="status"
                        defaultValue={lead.status}
                        className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
                      >
                        {STATUS_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {STATUS_LABELS[value]}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        Update status
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              );
            })}
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
                Page {page} of {totalPages} ({totalMatching} leads)
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
