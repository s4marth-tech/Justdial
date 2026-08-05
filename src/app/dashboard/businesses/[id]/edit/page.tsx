import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BusinessForm } from "@/components/business-form";
import { BusinessMediaUpload } from "@/components/business-media-upload";
import { Separator } from "@/components/ui/separator";

type EditBusinessPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditBusinessPage({ params }: EditBusinessPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [business, categories] = await Promise.all([
    prisma.business.findUnique({ where: { id }, include: { media: { orderBy: { createdAt: "asc" } } } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!business) {
    notFound();
  }
  if (business.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Edit business</h1>
      <BusinessForm
        categories={categories}
        business={{
          id: business.id,
          name: business.name,
          categoryId: business.categoryId,
          description: business.description ?? "",
          phone: business.phone,
          whatsapp: business.whatsapp ?? "",
          email: business.email ?? "",
          website: business.website ?? "",
          addressLine: business.addressLine,
          city: business.city,
          state: business.state,
          pincode: business.pincode,
          latitude: business.latitude,
          longitude: business.longitude,
        }}
      />

      <Separator className="my-8" />

      <h2 className="mb-4 text-lg font-semibold">Photos</h2>
      <BusinessMediaUpload
        businessId={business.id}
        media={business.media.map((item) => ({ id: item.id, url: item.url }))}
      />
    </div>
  );
}
