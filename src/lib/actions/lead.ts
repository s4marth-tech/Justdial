"use server";

import { randomUUID, createHash } from "node:crypto";
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leadSchema, broadcastLeadSchema } from "@/lib/validations/lead";
import { LeadStatus, LeadType, LeadSource } from "@/generated/prisma/enums";
import { notifyOwnerOfNewLead } from "@/lib/notify";
import { getBroadcastCandidates } from "@/lib/queries/business";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
// Per-identity (logged-in user, or anonymous-visitor cookie): the tight
// limit — this is what actually catches one source spamming one business.
const IDENTITY_RATE_LIMIT_MAX = 5;
// Per-IP backstop: much looser, since many real visitors can legitimately
// share one IP (carrier-grade NAT is common on Indian mobile networks).
// This only catches a single IP cycling through many identities/cookies.
const IP_RATE_LIMIT_MAX = 20;

// Broadcast-specific caps, on top of the per-business ones above. A single
// broadcast fans out to up to BROADCAST_FANOUT_LIMIT businesses, and the
// per-business limits never trip if every submission targets a fresh set of
// businesses (varying category/city each time) — so without a cap on the
// submission itself, one identity could generate unbounded leads and owner
// notifications just by broadcasting to different combos. Checked once,
// upfront, against the whole submission, not per recipient.
const BROADCAST_FANOUT_LIMIT = 5;
const BROADCAST_LEAD_CAP = 15; // ~3 broadcasts' worth per identity, per hour
const BROADCAST_IP_CAP = 50; // same cookie-clearing evasion the IP tier above guards against

const VISITOR_COOKIE_NAME = "jd_vid";

async function getRequestIp() {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
}

// Rate-limiting only ever needs equality comparison, never the real address,
// so we store a hash rather than the raw IP.
function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}

// First-party cookie identifying "this browser" for anonymous visitors, so
// rate-limiting doesn't have to fall back to IP alone (which several real
// visitors can share) to tell sources apart.
async function getAnonymousVisitorId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
  if (existing) return existing;

  const visitorId = randomUUID();
  cookieStore.set(VISITOR_COOKIE_NAME, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return visitorId;
}

type LeadIdentity = {
  userId: string | undefined;
  hashedIp: string;
  visitorId: string | null;
};

async function resolveIdentity(): Promise<LeadIdentity> {
  const session = await auth();
  const userId = session?.user?.id;
  const hashedIp = hashIp(await getRequestIp());
  const visitorId = userId ? null : await getAnonymousVisitorId();
  return { userId, hashedIp, visitorId };
}

type AttemptCreateLeadInput = {
  business: {
    id: string;
    name: string;
    owner: { email: string | null; name: string | null; emailNotificationsEnabled: boolean } | null;
  };
  identity: LeadIdentity;
  name: string;
  phone: string;
  message: string | undefined;
  type: LeadType;
  source: LeadSource;
};

// Shared by createLead and createBroadcastLead: the actual per-business
// rate-limit check, then create, then notify. Both flows go through this
// exact code, so "respect the same spam protections" is literal rather than
// a second implementation that could drift from the first.
async function attemptCreateLead({
  business,
  identity,
  name,
  phone,
  message,
  type,
  source,
}: AttemptCreateLeadInput): Promise<boolean> {
  const { userId, hashedIp, visitorId } = identity;
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const [identityCount, ipCount] = await Promise.all([
    prisma.lead.count({
      where: {
        businessId: business.id,
        createdAt: { gte: windowStart },
        ...(userId ? { userId } : { visitorId }),
      },
    }),
    prisma.lead.count({
      where: { businessId: business.id, createdAt: { gte: windowStart }, ipAddress: hashedIp },
    }),
  ]);
  if (identityCount >= IDENTITY_RATE_LIMIT_MAX || ipCount >= IP_RATE_LIMIT_MAX) {
    return false;
  }

  await prisma.lead.create({
    data: {
      businessId: business.id,
      userId,
      name,
      phone,
      message: message || undefined,
      type,
      source,
      ipAddress: hashedIp,
      visitorId,
    },
  });

  await notifyOwnerOfNewLead({
    ownerEmail: business.owner?.email ?? null,
    ownerName: business.owner?.name ?? null,
    emailNotificationsEnabled: business.owner?.emailNotificationsEnabled ?? true,
    businessName: business.name,
    leadType: type,
    leadName: name,
    leadPhone: phone,
    leadMessage: message,
  });

  return true;
}

export async function createLead(input: unknown) {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Honeypot: a real visitor never fills this field. Pretend success so an
  // automated submitter has no signal it was rejected.
  if (parsed.data.honeypot) {
    return { ok: true };
  }

  const { businessId, name, phone, message, type } = parsed.data;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      status: true,
      owner: { select: { email: true, name: true, emailNotificationsEnabled: true } },
    },
  });
  if (!business || business.status !== "APPROVED") {
    return { error: "This business is not accepting enquiries right now." };
  }

  const identity = await resolveIdentity();
  const created = await attemptCreateLead({
    business,
    identity,
    name,
    phone,
    message,
    type,
    source: "DIRECT",
  });
  if (!created) {
    return { error: "You've sent this business a few requests recently — please try again later." };
  }

  return { ok: true };
}

export async function createBroadcastLead(input: unknown) {
  const parsed = broadcastLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Honeypot: pretend success, same as createLead.
  if (parsed.data.honeypot) {
    return { ok: true, matchedCount: 0 };
  }

  const { category, city, name, phone, message } = parsed.data;
  const identity = await resolveIdentity();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const [broadcastIdentityCount, broadcastIpCount] = await Promise.all([
    prisma.lead.count({
      where: {
        source: "BROADCAST",
        createdAt: { gte: windowStart },
        ...(identity.userId ? { userId: identity.userId } : { visitorId: identity.visitorId }),
      },
    }),
    prisma.lead.count({
      where: { source: "BROADCAST", createdAt: { gte: windowStart }, ipAddress: identity.hashedIp },
    }),
  ]);
  if (broadcastIdentityCount >= BROADCAST_LEAD_CAP || broadcastIpCount >= BROADCAST_IP_CAP) {
    return { error: "You've sent a few quote requests recently — please try again later." };
  }

  const candidates = await getBroadcastCandidates({
    category,
    city,
    limit: BROADCAST_FANOUT_LIMIT,
  });
  if (candidates.length === 0) {
    return { error: "No businesses found for that category and city." };
  }

  let matchedCount = 0;
  for (const business of candidates) {
    // Sequential on purpose: each business's own rate limit is independent
    // (different businessId), so there's no correctness reason to
    // parallelize, and sequential keeps this easy to reason about and test.
    const created = await attemptCreateLead({
      business,
      identity,
      name,
      phone,
      message,
      type: "ENQUIRY",
      source: "BROADCAST",
    });
    if (created) matchedCount += 1;
  }

  if (matchedCount === 0) {
    return { error: "Those businesses have had a few requests recently — please try again later." };
  }

  return { ok: true, matchedCount };
}

export async function updateLeadStatus(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const leadId = formData.get("leadId");
  const status = formData.get("status");
  if (typeof leadId !== "string" || typeof status !== "string") return;
  if (!(status in LeadStatus)) return;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { business: { select: { ownerId: true } } },
  });
  if (!lead) return;
  if (lead.business.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    return;
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: status as LeadStatus },
  });

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
}
