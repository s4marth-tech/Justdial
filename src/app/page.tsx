import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LandingIntentDialog } from "@/components/landing-intent-dialog";
import { HomeSearch } from "@/components/homepage-search";

export default async function Home() {
  const [categories, session] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    auth(),
  ]);
  const role = session?.user?.role;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 dark:bg-black">
      <LandingIntentDialog
        isLoggedIn={Boolean(session?.user)}
        canManageBusiness={role === "BUSINESS_OWNER" || role === "ADMIN"}
      />
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center gap-10 px-6 py-24">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Find local businesses near you
          </h1>
          <p className="max-w-md text-muted-foreground">
            Search restaurants, doctors, electricians, and hundreds of other
            local services.
          </p>
        </div>

        <HomeSearch categories={categories} />
      </main>
    </div>
  );
}
