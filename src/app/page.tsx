import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LandingIntentDialog } from "@/components/landing-intent-dialog";
import { HomeSearch } from "@/components/homepage-search";
import { LAD_CATEGORY_SLUGS } from "@/lib/categories";

export default async function Home() {
  const [categories, session] = await Promise.all([
    prisma.category.findMany({
      where: { slug: { in: [...LAD_CATEGORY_SLUGS] } },
      orderBy: { name: "asc" },
    }),
    auth(),
  ]);

  return (
    <div className="flex flex-1 flex-col items-center bg-background">
      <LandingIntentDialog isLoggedIn={Boolean(session?.user)} />
      <main className="flex w-full max-w-5xl flex-1 flex-col items-start gap-10 px-6 py-16 sm:py-20">
        <div className="max-w-xl">
          <h1 className="text-4xl leading-tight sm:text-5xl">
            Find local pros you can trust.
          </h1>
          <p className="mt-3 max-w-md text-lg text-foreground/80">
            Search verified businesses near you — no clutter, no noise, just
            the right match.
          </p>
        </div>

        <HomeSearch categories={categories} />
      </main>
    </div>
  );
}
