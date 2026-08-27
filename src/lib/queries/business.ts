import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { findClosestMatch } from "@/lib/fuzzy";
import { CITIES } from "@/lib/cities";

const PAGE_SIZE = 12;

export type BusinessSearchParams = {
  category?: string;
  specialty?: string;
  city?: string;
  q?: string;
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
}: {
  category?: string;
  specialty?: string;
  city?: string;
  q?: string;
}): Prisma.BusinessWhereInput {
  return {
    status: "APPROVED",
    ...(category ? { category: { slug: category } } : {}),
    // Only meaningful alongside a category (specialties are scoped to one),
    // but scoping by slug alone is still correct even without it.
    ...(specialty ? { specialty: { slug: specialty } } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { category: { name: { contains: q, mode: "insensitive" } } },
            { city: { contains: q, mode: "insensitive" } },
            { state: { contains: q, mode: "insensitive" } },
            { addressLine: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function searchBusinesses({
  category,
  specialty,
  city,
  q,
  page = 1,
}: BusinessSearchParams) {
  const currentPage = Math.max(1, page);
  const trimmedQ = q?.trim() || undefined;

  const runSearch = async (qValue?: string) => {
    const where = buildWhere({ category, specialty, city, q: qValue });
    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          category: true,
          specialty: { select: { name: true } },
          media: { take: 1, orderBy: { createdAt: "asc" } },
        },
        orderBy: { avgRating: "desc" },
        take: PAGE_SIZE,
        skip: (currentPage - 1) * PAGE_SIZE,
      }),
      prisma.business.count({ where }),
    ]);
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
