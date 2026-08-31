import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { searchBusinesses } from "@/lib/queries/business";
import { BusinessCard } from "@/components/business-card";
import { BroadcastLeadDialog } from "@/components/broadcast-lead-dialog";
import { SearchFilters } from "@/components/search-filters";
import { LAD_CATEGORY_SLUGS } from "@/lib/categories";
import { Badge } from "@/components/ui/badge";

type SearchPageProps = {
  searchParams: Promise<{
    category?: string;
    specialty?: string;
    city?: string;
    q?: string;
    page?: string;
  }>;
};

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { category, city } = await searchParams;

  const categoryLabel = category
    ? (await prisma.category.findUnique({ where: { slug: category }, select: { name: true } }))?.name ?? null
    : null;

  const parts = [categoryLabel, city].filter((part): part is string => Boolean(part));
  const title = parts.length > 0 ? `${parts.join(" in ")} | My Lads` : "Search local businesses | My Lads";
  const description =
    parts.length > 0
      ? `Browse ${categoryLabel ? categoryLabel.toLowerCase() : "local businesses"}${city ? ` in ${city}` : ""} on My Lads.`
      : "Search verified local businesses near you.";

  return { title, description };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { category, specialty, city, q, page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const [{ businesses, total, pageSize, correctedQuery }, categories, specialties] = await Promise.all([
    searchBusinesses({ category, specialty, city, q, page }),
    prisma.category.findMany({
      where: { slug: { in: [...LAD_CATEGORY_SLUGS] } },
      orderBy: { name: "asc" },
    }),
    prisma.specialty.findMany({
      where: { category: { slug: { in: [...LAD_CATEGORY_SLUGS] } } },
      select: { id: true, name: true, slug: true, categoryId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const otherCategories = categories.filter((c) => c.slug !== category);

  const otherCategoryHref = (slug: string) => {
    const params = new URLSearchParams({ category: slug });
    if (city) params.set("city", city);
    return `/search?${params.toString()}`;
  };

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (specialty) params.set("specialty", specialty);
    if (city) params.set("city", city);
    if (q) params.set("q", q);
    params.set("page", String(targetPage));
    return `/search?${params.toString()}`;
  };

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SearchFilters
            categories={categories}
            specialties={specialties}
            initialCategory={category}
            initialSpecialty={specialty}
            initialCity={city}
            initialQ={q}
          />
        </aside>

        <div className="min-w-0">
          {otherCategories.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Other categories:
              </span>
              {otherCategories.map((otherCategory) => (
                <Link key={otherCategory.id} href={otherCategoryHref(otherCategory.slug)}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                    {otherCategory.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">
                {total} result{total === 1 ? "" : "s"}
                {city ? ` in ${city}` : ""}
                {q ? ` for "${q}"` : ""}
              </h1>
              {correctedQuery && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Showing results for <span className="font-medium">&quot;{correctedQuery}&quot;</span> instead.
                </p>
              )}
            </div>
            {category && city && total >= 2 && businesses.length > 0 && (
              <BroadcastLeadDialog category={category} categoryLabel={businesses[0].category.name} city={city} />
            )}
          </div>

          {businesses.length === 0 ? (
            <p className="text-muted-foreground">
              No businesses found. Try a different city, category, or keyword.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {businesses.map((business) => (
                  <BusinessCard key={business.id} business={business} />
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
      </div>
    </div>
  );
}
