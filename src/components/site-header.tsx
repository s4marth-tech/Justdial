import Link from "next/link";
import { Search } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export async function SiteHeader() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-2">
        <Link href="/" className="font-heading text-xl text-primary">
          My Lads
        </Link>
        <form
          action="/search"
          method="GET"
          className="order-3 flex w-full items-center gap-1 sm:order-none sm:mx-4 sm:w-auto sm:max-w-xs sm:flex-1"
        >
          <Input
            name="q"
            placeholder="Search businesses, categories, cities..."
            className="h-9"
            aria-label="Search"
          />
          <Button type="submit" size="icon" variant="ghost" className="shrink-0" aria-label="Search">
            <Search className="size-4" />
          </Button>
        </form>
        <nav className="flex flex-wrap items-center gap-2">
          {session?.user ? (
            <>
              {(role === "BUSINESS_OWNER" || role === "ADMIN") && (
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/dashboard">Dashboard</Link>}
                />
              )}
              {role === "ADMIN" && (
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/admin">Admin</Link>}
                />
              )}
              {role === "USER" && (
                // Owners/admins already reach the same settings from within
                // /dashboard — this is the only account entry point a plain
                // customer has.
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/account">Account</Link>}
                />
              )}
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/?setup=1">Retake setup</Link>}
              />
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/login">Log in</Link>}
              />
              <Button size="sm" nativeButton={false} render={<Link href="/signup">Sign up</Link>} />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
