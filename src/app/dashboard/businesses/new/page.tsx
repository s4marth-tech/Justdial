import { prisma } from "@/lib/prisma";
import { BusinessForm } from "@/components/business-form";

export default async function NewBusinessPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Add a business</h1>
      <BusinessForm categories={categories} />
    </div>
  );
}
