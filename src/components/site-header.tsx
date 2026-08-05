import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          JustDial
        </Link>
        <nav className="flex items-center gap-2">
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
