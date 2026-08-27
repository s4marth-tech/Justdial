import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen">
      <div className="border-b">
        <nav className="mx-auto flex max-w-3xl gap-1 px-6 py-2">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/admin">Businesses</Link>} />
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/admin/leads">Leads</Link>} />
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/admin/claims">Claims</Link>} />
        </nav>
      </div>
      {children}
    </div>
  );
}
