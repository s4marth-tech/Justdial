import { prisma } from "@/lib/prisma";
import { BusinessForm } from "@/components/business-form";
import { LAD_CATEGORY_SLUGS } from "@/lib/categories";

export default async function NewBusinessPage() {
  const [categories, specialties] = await Promise.all([
    prisma.category.findMany({
      where: { slug: { in: [...LAD_CATEGORY_SLUGS] } },
      orderBy: { name: "asc" },
    }),
    prisma.specialty.findMany({
      where: { category: { slug: { in: [...LAD_CATEGORY_SLUGS] } } },
      select: { id: true, name: true, categoryId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Add a business</h1>
      <BusinessForm categories={categories} specialties={specialties} />
    </div>
  );
}
