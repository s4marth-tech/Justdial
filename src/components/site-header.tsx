import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SiteHeaderShell } from "@/components/site-header-shell";

export async function SiteHeader() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <SiteHeaderShell
      logo={
        <Link href="/" className="font-heading text-xl text-primary">
          My Lads
        </Link>
      }
      nav={
        session?.user ? (
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
        )
      }
    />
  );
}
