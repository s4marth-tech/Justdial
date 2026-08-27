import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Owner/admin tooling, raw API endpoints, and search — nothing here is
      // meant to be indexed, and all three redirect anonymous requests
      // (including crawlers) to /login anyway.
      disallow: ["/dashboard", "/admin", "/api", "/search"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
