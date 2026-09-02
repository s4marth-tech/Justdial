import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type BusinessCardProps = {
  business: {
    slug: string;
    name: string;
    city: string;
    phone: string;
    avgRating: number;
    reviewCount: number;
    verificationStatus: string;
    category: { name: string };
    specialty: { name: string } | null;
    media: { url: string }[];
  };
};

export function BusinessCard({ business }: BusinessCardProps) {
  const thumbnail = business.media[0]?.url;

  return (
    <Link href={`/business/${business.slug}`} className="block">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        {thumbnail && (
          <div className="relative aspect-video w-full">
            <Image
              src={thumbnail}
              alt=""
              fill
              sizes="(min-width: 640px) 33vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <CardHeader className="flex-row items-center gap-3">
          <Avatar size="lg" className="shrink-0">
            {thumbnail && <AvatarImage src={thumbnail} alt="" />}
            <AvatarFallback>{business.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="truncate">{business.name}</CardTitle>
            <CardDescription className="flex flex-col gap-0.5">
              <span className="truncate">{business.specialty?.name ?? business.category.name}</span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="size-3 shrink-0" />
                {business.city}
              </span>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {business.reviewCount === 0 ? (
              // avgRating defaults to 0 for a business with no reviews yet, so
              // "0.0 (0)" would misread as a bad rating rather than no rating —
              // see the Business.avgRating comment in schema.prisma.
              <Badge variant="secondary">New</Badge>
            ) : (
              <div className="flex items-center gap-1 text-sm">
                <Star className="size-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{business.avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({business.reviewCount})</span>
              </div>
            )}
            {business.verificationStatus === "VERIFIED" && (
              <Badge variant="secondary" className="gap-1 text-blue-700 dark:text-blue-400">
                <BadgeCheck className="size-3.5" />
                Verified
              </Badge>
            )}
          </div>
          <Badge variant="outline">{business.phone}</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
