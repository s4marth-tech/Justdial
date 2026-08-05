import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 12;

export type BusinessSearchParams = {
  category?: string;
  city?: string;
  q?: string;
  page?: number;
};

export async function searchBusinesses({
  category,
  city,
  q,
  page = 1,
}: BusinessSearchParams) {
  const where: Prisma.BusinessWhereInput = {
    status: "APPROVED",
    ...(category ? { category: { slug: category } } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const currentPage = Math.max(1, page);

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      where,
      include: {
        category: true,
        media: { take: 1, orderBy: { createdAt: "asc" } },
      },
      orderBy: { avgRating: "desc" },
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
    }),
    prisma.business.count({ where }),
  ]);

  return { businesses, total, page: currentPage, pageSize: PAGE_SIZE };
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
