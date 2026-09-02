import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { findClosestMatch } from "@/lib/fuzzy";
import { CITIES } from "@/lib/cities";
import { getsSearchVisibilityBoost, VERIFIED_STATUS } from "@/lib/verification/scoring";

const PAGE_SIZE = 12;

export type BusinessSearchParams = {
  category?: string;
  specialty?: string;
  city?: string;
  q?: string;
  minRating?: number;
  openNow?: boolean;
  verifiedOnly?: boolean;
  page?: number;
};

// "Search using anything": one free-text term matches against every field a
// visitor might type — business name/description, category (so a category
// keyword like "doctors" surfaces every business in that category, not just
// ones whose name/description happens to contain the word), and city/state/
// address (so typing a place also works from the single search box).
function buildWhere({
  category,
  specialty,
  city,
  q,
  minRating,
  verifiedOnly,
}: {
  category?: string;
  specialty?: string;
  city?: string;
  q?: string;
  minRating?: number;
  verifiedOnly?: boolean;
}): Prisma.BusinessWhereInput {
  // Two independent OR-groups (free-text search, rating) can't both live as
  // a top-level `OR` key on the same object — the second would clobber the
  // first. Combine them as separate AND members instead.
  const and: Prisma.BusinessWhereInput[] = [];

  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { city: { contains: q, mode: "insensitive" } },
        { state: { contains: q, mode: "insensitive" } },
        { addressLine: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (minRating) {
    // reviewCount === 0 is the canonical "no rating data yet" signal (see
    // the Business.avgRating comment in schema.prisma) — avgRating defaults
    // to 0, so a literal `avgRating >= minRating` would silently drop every
    // unrated listing the moment a visitor filters by rating, burying every
    // new business. Decision: surface unrated businesses alongside the
    // filter rather than excluding them from its scope — BusinessCard shows
    // a "New" badge instead of a star rating for them so it's clear why an
    // apparently-unrated listing appears under e.g. "4+ stars".
    and.push({ OR: [{ reviewCount: 0 }, { avgRating: { gte: minRating } }] });
  }

  return {
    status: "APPROVED",
    ...(category ? { category: { slug: category } } : {}),
    // Only meaningful alongside a category (specialties are scoped to one),
    // but scoping by slug alone is still correct even without it.
    ...(specialty ? { specialty: { slug: specialty } } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(verifiedOnly ? { verificationStatus: VERIFIED_STATUS } : {}),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

// ---- "Open now" -----------------------------------------------------------
//
// openingHours is free-text per day (see mapOpeningHours() in
// prisma/import-scraped.ts) — things like "9 AM to 6 PM",
// "10:30 AM to 3 PM, 6 to 9 PM", "Closed", or "Open 24 hours" — not a
// structured start/end schema, so "is this open right now" can't be
// expressed as a Postgres WHERE clause. Instead we fetch the (id,
// openingHours) of everything else matching the current filters, evaluate
// each business in JS, and constrain the paginated query to that id set.
//
// Timezone assumption: every seeded city is in India and businesses don't
// carry their own timezone/UTC offset, so "now" is computed once in IST
// (Asia/Kolkata) and applied to all businesses regardless of the visitor's
// own timezone.

const BUSINESS_TIME_ZONE = "Asia/Kolkata";

// Matches the day keys mapOpeningHours() writes (DAY_KEYS in
// prisma/import-scraped.ts): mon, tue, wed, thu, fri, sat, sun.
const WEEKDAY_TO_DAY_KEY: Record<string, string> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

function currentIstMoment(): { dayKey: string; minutesSinceMidnight: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  // Node's ICU renders midnight as hour "24" under hour12:false.
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  return { dayKey: WEEKDAY_TO_DAY_KEY[weekday] ?? "mon", minutesSinceMidnight: hour * 60 + minute };
}

function parseClockToken(
  token: string
): { hour: number; minute: number; meridiem: "AM" | "PM" | null } | null {
  const match = token.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (hour < 1 || hour > 12 || minute > 59) return null;
  return { hour, minute, meridiem: (match[3]?.toUpperCase() as "AM" | "PM" | undefined) ?? null };
}

function to24Hour(hour12: number, meridiem: "AM" | "PM"): number {
  if (meridiem === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

// A single "H[:MM] [AM|PM] to H[:MM] [AM|PM]" range. One side sometimes
// omits AM/PM in the scraped data (e.g. "6 to 9 PM", "12 to 5 PM") — in
// every sample we found, the omitted side inherits the other side's
// meridiem, so that's the rule applied here. (This can misread a bare "12"
// on the omitted side as noon vs. midnight in a case we haven't seen in the
// data — see parseDayHours.)
function parseRange(range: string): [number, number] | null {
  const [startRaw, endRaw] = range.split(/\s+to\s+/i);
  if (!startRaw || !endRaw) return null;
  const start = parseClockToken(startRaw);
  const end = parseClockToken(endRaw);
  if (!start || !end) return null;
  const inherited = start.meridiem ?? end.meridiem;
  if (!inherited) return null;
  const startMinutes = to24Hour(start.hour, start.meridiem ?? inherited) * 60 + start.minute;
  let endMinutes = to24Hour(end.hour, end.meridiem ?? inherited) * 60 + end.minute;
  if (endMinutes <= startMinutes) endMinutes += 24 * 60; // e.g. a hypothetical "9 PM to 1 AM"
  return [startMinutes, endMinutes];
}

// Returns the day's open ranges in minutes-since-midnight, `[]` for
// "Closed", or `null` if the text doesn't match a pattern we recognize (in
// which case the caller treats the business as not open rather than
// guessing).
function parseDayHours(text: string): Array<[number, number]> | null {
  const trimmed = text.trim();
  if (/^closed$/i.test(trimmed)) return [];
  if (/^open 24 hours$/i.test(trimmed)) return [[0, 24 * 60]];
  const ranges = trimmed.split(",").map((part) => parseRange(part));
  return ranges.every((r): r is [number, number] => r !== null) ? ranges : null;
}

// Exported for testability. `now` defaults to the current IST moment; pass
// it explicitly to check a specific time.
export function isBusinessOpenNow(
  openingHours: Prisma.JsonValue | null,
  now: { dayKey: string; minutesSinceMidnight: number } = currentIstMoment()
): boolean {
  if (!openingHours || typeof openingHours !== "object" || Array.isArray(openingHours)) return false;
  const text = (openingHours as Record<string, unknown>)[now.dayKey];
  if (typeof text !== "string") return false;
  const ranges = parseDayHours(text);
  if (!ranges) return false;
  return ranges.some(([start, end]) => now.minutesSinceMidnight >= start && now.minutesSinceMidnight < end);
}

export async function searchBusinesses({
  category,
  specialty,
  city,
  q,
  minRating,
  openNow,
  verifiedOnly,
  page = 1,
}: BusinessSearchParams) {
  const currentPage = Math.max(1, page);
  const trimmedQ = q?.trim() || undefined;

  // "Open now" and the verified-first tier below both need a boolean check
  // per business (parsed opening-hours text; verificationStatus) that can't
  // be expressed as a Postgres WHERE/ORDER BY — so instead of DB-level
  // skip/take, every structurally-matching business is fetched once (still
  // ordered by avgRating desc), filtered/reordered in JS, and paginated by
  // slicing the resulting array. Fine at this directory's scale; revisit if
  // the table grows enough for that full fetch to matter.
  const runSearch = async (qValue?: string) => {
    const where = buildWhere({ category, specialty, city, q: qValue, minRating, verifiedOnly });
    const all = await prisma.business.findMany({
      where,
      include: {
        category: true,
        specialty: { select: { name: true } },
        media: { take: 1, orderBy: { createdAt: "asc" } },
      },
      orderBy: { avgRating: "desc" },
    });

    const openFiltered = openNow
      ? (() => {
          const now = currentIstMoment();
          return all.filter((b) => isBusinessOpenNow(b.openingHours, now));
        })()
      : all;

    // Flat tier, not a gradient: verified businesses sort above unverified
    // ones regardless of verificationScore, and each group otherwise keeps
    // the avgRating-desc order from the query above — Array#filter is
    // stable, so partitioning like this never reorders within a group.
    const boosted = [
      ...openFiltered.filter((b) => getsSearchVisibilityBoost(b.verificationStatus)),
      ...openFiltered.filter((b) => !getsSearchVisibilityBoost(b.verificationStatus)),
    ];

    const total = boosted.length;
    const businesses = boosted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    return { businesses, total };
  };

  let { businesses, total } = await runSearch(trimmedQ);

  // Autocorrect: a literal `contains` match finds nothing for a typo'd term
  // (e.g. "docttor"), so fall back to the closest known category or city
  // name by edit distance and retry once with that instead.
  let correctedQuery: string | null = null;
  if (trimmedQ && total === 0) {
    const categories = await prisma.category.findMany({ select: { name: true } });
    const suggestion = findClosestMatch(trimmedQ, [
      ...categories.map((c) => c.name),
      ...CITIES.map((c) => c.name),
    ]);
    if (suggestion) {
      const retry = await runSearch(suggestion);
      if (retry.total > 0) {
        businesses = retry.businesses;
        total = retry.total;
        correctedQuery = suggestion;
      }
    }
  }

  return { businesses, total, page: currentPage, pageSize: PAGE_SIZE, correctedQuery };
}

// Candidates for a "get quotes from multiple businesses" broadcast — same
// approved-only, category+city matching as searchBusinesses, ordered by
// rating so "top N" means the N best-rated matches, capped at `limit`.
export async function getBroadcastCandidates({
  category,
  city,
  limit,
}: {
  category: string;
  city: string;
  limit: number;
}) {
  return prisma.business.findMany({
    where: {
      status: "APPROVED",
      category: { slug: category },
      city: { contains: city, mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: { select: { email: true, name: true, emailNotificationsEnabled: true } },
    },
    orderBy: { avgRating: "desc" },
    take: limit,
  });
}
