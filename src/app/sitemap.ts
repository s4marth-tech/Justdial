import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const businesses = await prisma.business.findMany({
    where: { status: "APPROVED" },
    select: { slug: true, updatedAt: true },
  });

  // /search itself now requires login (redirects anonymous visitors,
  // including crawlers, to /login), so those result pages can't be indexed
  // — only individual business pages, which stay publicly viewable, belong
  // in the sitemap.
  const businessUrls: MetadataRoute.Sitemap = businesses.map((b) => ({
    url: `${siteUrl}/business/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [{ url: siteUrl, changeFrequency: "daily", priority: 1 }, ...businessUrls];
}
