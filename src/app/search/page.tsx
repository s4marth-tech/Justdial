import Link from "next/link";
import { searchBusinesses } from "@/lib/queries/business";
import { BusinessCard } from "@/components/business-card";
import { BroadcastLeadDialog } from "@/components/broadcast-lead-dialog";

type SearchPageProps = {
  searchParams: Promise<{
    category?: string;
    city?: string;
    q?: string;
    page?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { category, city, q, page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const { businesses, total, pageSize } = await searchBusinesses({
    category,
    city,
    q,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (q) params.set("q", q);
    params.set("page", String(targetPage));
    return `/search?${params.toString()}`;
  };

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {total} result{total === 1 ? "" : "s"}
          {city ? ` in ${city}` : ""}
          {q ? ` for "${q}"` : ""}
        </h1>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  );
}
