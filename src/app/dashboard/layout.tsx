import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "BUSINESS_OWNER" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen">
      <DashboardNav />
      {children}
    </div>
  );
}
