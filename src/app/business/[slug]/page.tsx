import { notFound } from "next/navigation";
import Image from "next/image";
import { MessageCircle, Mail, Globe, MapPin, Star } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LeadActions, PhoneReveal } from "@/components/lead-actions";
import { ReviewForm } from "@/components/review-form";
import { BusinessMap } from "@/components/business-map";

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

type BusinessPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      category: true,
      media: { orderBy: { createdAt: "asc" } },
      reviews: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!business || business.status !== "APPROVED") {
    notFound();
  }

  const session = await auth();
  const isOwner = business.ownerId === session?.user?.id;
  const myReview = session?.user
    ? business.reviews.find((review) => review.userId === session.user.id) ?? null
    : null;

  const openingHours = business.openingHours as Record<string, string> | null;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-6 flex flex-col gap-2">
        <Badge variant="secondary" className="w-fit">
          {business.category.name}
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">{business.name}</h1>
        <div className="flex items-center gap-1.5 text-sm">
          <Star className="size-4 fill-yellow-400 text-yellow-400" />
          <span className="font-medium">{business.avgRating.toFixed(1)}</span>
          <span className="text-muted-foreground">
            ({business.reviewCount} review{business.reviewCount === 1 ? "" : "s"})
          </span>
        </div>
      </div>

      {business.media.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {business.media.map((item) => (
            <div key={item.id} className="relative h-40 w-56 shrink-0 overflow-hidden rounded-lg">
              <Image
                src={item.url}
                alt={business.name}
                fill
                sizes="224px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {business.description && (
        <p className="mb-6 text-muted-foreground">{business.description}</p>
      )}

      <LeadActions businessId={business.id} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <PhoneReveal businessId={business.id} phone={business.phone} />
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:underline"
              >
                <MessageCircle className="size-4 text-muted-foreground" />
                WhatsApp
              </a>
            )}
            {business.email && (
              <a href={`mailto:${business.email}`} className="flex items-center gap-2 hover:underline">
                <Mail className="size-4 text-muted-foreground" />
                {business.email}
              </a>
            )}
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:underline"
              >
                <Globe className="size-4 text-muted-foreground" />
                Website
              </a>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Address</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              {business.addressLine}, {business.city}, {business.state} {business.pincode}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <BusinessMap latitude={business.latitude} longitude={business.longitude} name={business.name} />
      </div>

      {openingHours && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Opening Hours</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            {Object.entries(openingHours).map(([day, hours]) => (
              <div key={day} className="flex justify-between">
                <span className="text-muted-foreground">{DAY_LABELS[day] ?? day}</span>
                <span>{hours}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Reviews</h2>
        {session?.user ? (
          !isOwner && (
            <ReviewForm
              businessId={business.id}
              existingReview={myReview ? { rating: myReview.rating, comment: myReview.comment } : null}
            />
          )
        ) : (
          <a href="/login" className="text-sm text-muted-foreground underline underline-offset-4">
            Log in to leave a review
          </a>
        )}
      </div>
      {business.reviews.length === 0 ? (
        <p className="text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {business.reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="flex flex-col gap-1 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{review.user.name}</span>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                    {review.rating}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
