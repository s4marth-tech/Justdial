// One-off importer for Google-Maps-scrape JSON exports (Apify-style "title/
// categoryName/address/location/..." shape). Reads a raw export from disk,
// maps it onto the Business schema, and inserts directly into the live DB as
// APPROVED, unclaimed listings (ownerId: null) — same pattern as the
// Faridabad real-data block in seed.ts. Reusable across cities: just point
// it at a different file with --file and --city/--state.
//
// Usage:
//   npx tsx prisma/import-scraped.ts --file "C:/path/to/export.json" --city Delhi --state Delhi

import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type ScrapedOpeningHour = { day: string; hours: string };

type ScrapedRecord = {
  title: string;
  description: string | null;
  categoryName: string | null;
  // The scraper's own search query for this record (e.g. "divorce lawyer",
  // "gst consultant") — a much more reliable categorization signal than
  // Google's auto-assigned categoryName, which fragments into dozens of
  // near-duplicate labels (Attorney / Law firm / Divorce lawyer / Criminal
  // justice attorney / ...) for what is, for our purposes, one category.
  searchString: string | null;
  address: string | null;
  neighborhood: string | null;
  street: string | null;
  postalCode: string | null;
  website: string | null;
  phone: string | null;
  phoneUnformatted: string | null;
  location: { lat: number; lng: number } | null;
  totalScore: number | null;
  reviewsCount: number | null;
  placeId: string;
  openingHours: ScrapedOpeningHour[] | null;
};

// searchString -> one of our three canonical professional-services
// categories. Anything not in these sets falls back to categoryName, same
// as before — this only collapses the searches we know were fired against
// a single intended category.
const CANONICAL_CATEGORIES: Record<string, { name: string; slug: string }> = {
  lawyers: { name: "Lawyers", slug: "lawyers" },
  accountants: { name: "Accountants", slug: "accountants" },
  doctors: { name: "Doctors", slug: "doctors" },
};

const SEARCH_STRING_TO_CANONICAL: Record<string, keyof typeof CANONICAL_CATEGORIES> = {
  // lawyer_terms
  "advocate": "lawyers",
  "property lawyer": "lawyers",
  "criminal lawyer": "lawyers",
  "divorce lawyer": "lawyers",
  "family court lawyer": "lawyers",
  "corporate lawyer": "lawyers",
  "consumer court lawyer": "lawyers",
  "law firm": "lawyers",
  "cheque bounce lawyer": "lawyers",
  "labour lawyer": "lawyers",
  // accountant_terms
  "chartered accountant": "accountants",
  "ca firm": "accountants",
  "tax consultant": "accountants",
  "gst consultant": "accountants",
  "income tax consultant": "accountants",
  "auditor": "accountants",
  "accounting firm": "accountants",
  "bookkeeping services": "accountants",
  "company secretary": "accountants",
  "financial consultant": "accountants",
  // doctor_terms
  "general physician": "doctors",
  "dentist": "doctors",
  "gynaecologist": "doctors",
  "orthopedic doctor": "doctors",
  "pediatrician": "doctors",
  "dermatologist": "doctors",
  "ent specialist": "doctors",
  "cardiologist": "doctors",
  "eye specialist": "doctors",
  "psychiatrist": "doctors",
};

function resolveCategory(record: ScrapedRecord): { name: string; slug: string } {
  const searchKey = record.searchString?.trim().toLowerCase();
  const canonicalKey = searchKey ? SEARCH_STRING_TO_CANONICAL[searchKey] : undefined;
  if (canonicalKey) return CANONICAL_CATEGORIES[canonicalKey];

  const categoryName = record.categoryName?.trim() || "General";
  return { name: categoryName, slug: slugify(categoryName) };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const file = get("--file");
  const city = get("--city");
  const state = get("--state") ?? city;
  if (!file || !city) {
    console.error("Usage: tsx prisma/import-scraped.ts --file <path> --city <name> [--state <name>]");
    process.exit(1);
  }
  return { file, city, state: state! };
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function shortHash(input: string) {
  return crypto.createHash("md5").update(input).digest("hex").slice(0, 8);
}

// The source file has mojibake in free-text fields (UTF-8 bytes that were
// already mis-decoded once before this export was produced) — clean the
// couple of sequences that show up in openingHours strings.
function cleanText(input: string) {
  return input.replace(/â¯/g, " ").replace(/â/g, "-").trim();
}

const DAY_KEYS: Record<string, string> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
};

function mapOpeningHours(hours: ScrapedOpeningHour[] | null): Prisma.InputJsonValue | undefined {
  if (!hours || hours.length === 0) return undefined;
  const result: Record<string, string> = {};
  for (const { day, hours: h } of hours) {
    const key = DAY_KEYS[day.toLowerCase()];
    if (key) result[key] = cleanText(h);
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function deriveAddressLine(record: ScrapedRecord): string | null {
  const street = record.street?.trim();
  const neighborhood = record.neighborhood?.trim();
  if (street) {
    const line = neighborhood && !street.includes(neighborhood) ? `${street}, ${neighborhood}` : street;
    return line.length > 200 ? line.slice(0, 200) : line;
  }
  const address = record.address?.trim();
  if (!address) return null;
  // Fallback: raw address is "..., City, State, Pincode, Country" — drop the
  // trailing 4 comma-segments so we don't duplicate the city/state/pincode
  // columns inside addressLine.
  const parts = address.split(",").map((p) => p.trim());
  const trimmed = parts.length > 4 ? parts.slice(0, -4).join(", ") : address;
  const line = trimmed || address;
  return line.length > 200 ? line.slice(0, 200) : line;
}

function derivePhone(record: ScrapedRecord): string | null {
  const compact = record.phoneUnformatted?.trim();
  if (compact) return compact;
  const formatted = record.phone?.trim();
  return formatted || null;
}

function deriveName(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 120) return trimmed;
  const delimiterIndex = Math.min(
    ...["/", "|"].map((d) => {
      const idx = trimmed.indexOf(d);
      return idx === -1 ? Infinity : idx;
    })
  );
  if (delimiterIndex !== Infinity && delimiterIndex >= 3) {
    return trimmed.slice(0, delimiterIndex).trim();
  }
  return trimmed.slice(0, 120).trim();
}

async function main() {
  const { file, city, state } = parseArgs();

  const raw = fs.readFileSync(file, "utf-8");
  const records: ScrapedRecord[] = JSON.parse(raw);

  const seenPlaceIds = new Set<string>();
  const skipped: { title: string; reason: string }[] = [];
  const categoriesSeen = new Map<string, string>(); // slug -> name

  type Mapped = {
    name: string;
    slug: string;
    description: string | null;
    categorySlug: string;
    phone: string;
    website: string | null;
    addressLine: string;
    pincode: string;
    latitude: number;
    longitude: number;
    avgRating: number;
    reviewCount: number;
    openingHours: Prisma.InputJsonValue | undefined;
  };

  const mapped: Mapped[] = [];

  for (const record of records) {
    if (seenPlaceIds.has(record.placeId)) {
      skipped.push({ title: record.title, reason: "duplicate placeId in source file" });
      continue;
    }
    seenPlaceIds.add(record.placeId);

    const phone = derivePhone(record);
    if (!phone) {
      skipped.push({ title: record.title, reason: "no phone number" });
      continue;
    }

    const addressLine = deriveAddressLine(record);
    if (!addressLine) {
      skipped.push({ title: record.title, reason: "no address" });
      continue;
    }

    const pincode = record.postalCode?.trim();
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      skipped.push({ title: record.title, reason: `missing/invalid pincode (${record.postalCode})` });
      continue;
    }

    if (!record.location || typeof record.location.lat !== "number" || typeof record.location.lng !== "number") {
      skipped.push({ title: record.title, reason: "no coordinates" });
      continue;
    }

    const category = resolveCategory(record);
    categoriesSeen.set(category.slug, category.name);

    const name = deriveName(record.title);
    mapped.push({
      name,
      slug: `${slugify(name)}-${shortHash(record.placeId)}`,
      description: record.description?.trim() || null,
      categorySlug: category.slug,
      phone,
      website: record.website?.trim() || null,
      addressLine,
      pincode,
      latitude: record.location.lat,
      longitude: record.location.lng,
      avgRating: record.totalScore ?? 0,
      reviewCount: record.reviewsCount ?? 0,
      openingHours: mapOpeningHours(record.openingHours),
    });
  }

  // Upsert one Category per distinct category slug seen in this file. For
  // searchString matches this resolves to the shared lawyers/accountants/
  // doctors category (merging into whatever seed.ts already created,
  // instead of splintering into one row per Google categoryName).
  const categoryIdBySlug = new Map<string, string>();
  for (const [slug, name] of categoriesSeen) {
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    categoryIdBySlug.set(slug, category.id);
  }

  // Upsert (not createMany) so re-running this script after a mapping fix
  // corrects already-inserted rows instead of silently skipping them —
  // slug is deterministic from (name, placeId), so it's a stable identity
  // across runs against the same source file.
  const CONCURRENCY = 5;
  let upserted = 0;
  for (let i = 0; i < mapped.length; i += CONCURRENCY) {
    const chunk = mapped.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map((m) => {
        const fields = {
          name: m.name,
          description: m.description,
          categoryId: categoryIdBySlug.get(m.categorySlug)!,
          phone: m.phone,
          website: m.website,
          addressLine: m.addressLine,
          city,
          state,
          pincode: m.pincode,
          latitude: m.latitude,
          longitude: m.longitude,
          status: "APPROVED" as const,
          ownerId: null,
          avgRating: m.avgRating,
          reviewCount: m.reviewCount,
          openingHours: m.openingHours,
        };
        return prisma.business
          .upsert({ where: { slug: m.slug }, update: fields, create: { slug: m.slug, ...fields } })
          .then(() => {
            upserted += 1;
          });
      })
    );
  }

  console.log(`Source file: ${file}`);
  console.log(`Total records in file: ${records.length}`);
  console.log(`Mapped and upserted: ${upserted}`);
  console.log(`Skipped: ${skipped.length}`);
  if (skipped.length > 0) {
    const reasonCounts = skipped.reduce<Record<string, number>>((acc, s) => {
      acc[s.reason] = (acc[s.reason] ?? 0) + 1;
      return acc;
    }, {});
    console.log("Skip reasons:", reasonCounts);
    console.log(
      "Skipped titles (first 10):",
      skipped.slice(0, 10).map((s) => s.title)
    );
  }
  console.log(`Categories touched (${categoryIdBySlug.size}):`, [...categoriesSeen.values()].sort());
  console.log("\nSample mapped records:");
  console.log(JSON.stringify(mapped.slice(0, 3), null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
