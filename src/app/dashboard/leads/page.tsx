import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { LeadType, LeadStatus, LeadSource } from "@/generated/prisma/enums";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = Object.values(LeadStatus);

const RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const SOURCE_OPTIONS = Object.values(LeadSource);

type LeadsPageProps = {
  searchParams: Promise<{
    business?: string;
    type?: string;
    status?: string;
    source?: string;
    range?: string;
  }>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { business: businessId, type, status, source, range } = await searchParams;
  const ownerId = session.user.id;

  const businesses = await prisma.business.findMany({
    where: { ownerId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const rangeCutoff =
    range === "7d"
      ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : range === "30d"
        ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        : null;

  // Scopes every query to businesses this owner actually owns — the
  // ownership check lives here, server-side, not just in what the UI shows.
  const scopeWhere: Prisma.LeadWhereInput = {
    business: {
      ownerId,
      ...(businessId && businessId !== "all" ? { id: businessId } : {}),
    },
  };

  const typeFilter = type && type in LeadType ? (type as LeadType) : undefined;
  const statusFilter = status && status in LeadStatus ? (status as LeadStatus) : undefined;
  const sourceFilter = source && source in LeadSource ? (source as LeadSource) : undefined;

  const listWhere: Prisma.LeadWhereInput = {
    ...scopeWhere,
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(sourceFilter ? { source: sourceFilter } : {}),
    ...(rangeCutoff ? { createdAt: { gte: rangeCutoff } } : {}),
  };

  const weekCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [leads, totalEver, totalThisWeek, totalThisMonth, enquiryCount, callbackCount, callCount] =
    await Promise.all([
      prisma.lead.findMany({
        where: listWhere,
        include: { business: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.count({ where: scopeWhere }),
      prisma.lead.count({ where: { ...scopeWhere, createdAt: { gte: weekCutoff } } }),
      prisma.lead.count({ where: { ...scopeWhere, createdAt: { gte: monthCutoff } } }),
      prisma.lead.count({ where: { ...scopeWhere, type: "ENQUIRY" } }),
      prisma.lead.count({ where: { ...scopeWhere, type: "CALLBACK_REQUEST" } }),
      prisma.lead.count({ where: { ...scopeWhere, type: "CALL" } }),
    ]);

  const hasAnyLeadsEver = totalEver > 0;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Leads</h1>

      {hasAnyLeadsEver && (
        <Card className="mb-6">
          <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-5">
            <div>
              <p className="text-2xl font-semibold">{totalThisWeek}</p>
              <p className="text-xs text-muted-foreground">This week</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{totalThisMonth}</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{enquiryCount}</p>
              <p className="text-xs text-muted-foreground">Enquiries</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{callbackCount}</p>
              <p className="text-xs text-muted-foreground">Callbacks</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{callCount}</p>
              <p className="text-xs text-muted-foreground">Number views</p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasAnyLeadsEver && (
        <form
          method="GET"
          className="mb-6 flex flex-wrap items-end gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
        >
          {businesses.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Business</span>
              <Select name="business" defaultValue={businessId ?? "all"}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All businesses</SelectItem>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Type</span>
            <Select name="type" defaultValue={type ?? "all"}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Status</span>
            <Select name="status" defaultValue={status ?? "all"}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Source</span>
            <Select name="source" defaultValue={source ?? "all"}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {SOURCE_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {SOURCE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Date range</span>
            <Select name="range" defaultValue={range ?? "all"}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" size="sm">
            Filter
          </Button>
        </form>
      )}

      {!hasAnyLeadsEver ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No leads yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Leads show up here when a customer enquires, requests a callback, or views your
            phone number on one of your business listings.
          </p>
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No leads match these filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try widening the date range or clearing a filter.
          </p>
        </div>
      ) : (
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
                    <a href={`tel:${lead.phone}`} className="text-muted-foreground hover:underline">
                      {lead.phone}
                    </a>
                    {lead.message && <p className="mt-1 text-muted-foreground">{lead.message}</p>}
                  </div>

                  <p className="text-xs text-muted-foreground">For {lead.business.name}</p>

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
      )}
    </div>
  );
}
