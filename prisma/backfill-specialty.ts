// One-off backfill: matches the 474 existing scraped/seeded businesses
// against the raw Google-Maps-scrape export files (which carry a
// `searchString` field per record — e.g. "cardiologist", "divorce lawyer")
// and sets Business.specialtyId accordingly. Existing businesses never had
// searchString persisted, so this re-derives it by matching each DB row back
// to its source record via phone number (import-scraped.ts's derivePhone()
// stores phoneUnformatted verbatim as Business.phone, so the match is exact
// once digits are normalized).
//
// Usage:
//   npx tsx prisma/backfill-specialty.ts --file "C:/path/to/city_lad_filtered.json"
//   (run once per city file)

import "dotenv/config";
import fs from "node:fs";
import { prisma } from "@/lib/prisma";

type ScrapedRecord = {
  title: string;
  searchString: string | null;
  phone: string | null;
  phoneUnformatted: string | null;
};

// Same searchString vocabulary as prisma/seed.ts's SPECIALTIES block —
// slug is just the search term with spaces turned into hyphens.
const KNOWN_SEARCH_STRINGS = new Set([
  "advocate", "property lawyer", "criminal lawyer", "divorce lawyer",
  "family court lawyer", "corporate lawyer", "consumer court lawyer",
  "law firm", "cheque bounce lawyer", "labour lawyer",
  "chartered accountant", "ca firm", "tax consultant", "gst consultant",
  "income tax consultant", "auditor", "accounting firm",
  "bookkeeping services", "company secretary", "financial consultant",
  "general physician", "dentist", "gynaecologist", "orthopedic doctor",
  "pediatrician", "dermatologist", "ent specialist", "cardiologist",
  "eye specialist", "psychiatrist",
]);

function specialtySlug(searchString: string): string {
  return searchString.trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Indian numbers: 10-digit subscriber number, optionally prefixed with
  // country code (91) and/or a leading 0 — compare on the last 10 digits so
  // "+919311320114", "919311320114", and "09311320114" all match.
  return digits.slice(-10);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--file");
  const file = i !== -1 ? args[i + 1] : undefined;
  if (!file) {
    console.error("Usage: tsx prisma/backfill-specialty.ts --file <path>");
    process.exit(1);
  }
  return { file };
}

async function main() {
  const { file } = parseArgs();
  const raw = fs.readFileSync(file, "utf-8");
  const records: ScrapedRecord[] = JSON.parse(raw);

  // Build phone -> searchString map from the source file. Skip records
  // without a usable searchString or phone.
  const phoneToSearchString = new Map<string, string>();
  for (const record of records) {
    const searchKey = record.searchString?.trim().toLowerCase();
    if (!searchKey || !KNOWN_SEARCH_STRINGS.has(searchKey)) continue;
    const phoneSource = record.phoneUnformatted?.trim() || record.phone?.trim();
    if (!phoneSource) continue;
    phoneToSearchString.set(normalizePhone(phoneSource), searchKey);
  }

  console.log(`Source file: ${file}`);
  console.log(`Records with usable searchString + phone: ${phoneToSearchString.size} / ${records.length}`);

  // Preload all specialties keyed by "categorySlug:specialtySlug" so we can
  // validate a candidate specialty actually belongs to the business's
  // existing category before assigning it (defensive sanity check).
  const specialties = await prisma.specialty.findMany({
    include: { category: { select: { slug: true } } },
  });
  const specialtyByKey = new Map(
    specialties.map((s) => [`${s.category.slug}:${s.slug}`, s.id])
  );

  const businesses = await prisma.business.findMany({
    where: { specialtyId: null },
    select: { id: true, phone: true, category: { select: { slug: true } } },
  });

  let matched = 0;
  let updated = 0;
  let skippedWrongCategory = 0;
  const updates: Promise<unknown>[] = [];

  for (const business of businesses) {
    const searchString = phoneToSearchString.get(normalizePhone(business.phone));
    if (!searchString) continue;
    matched += 1;

    const slug = specialtySlug(searchString);
    const specialtyId = specialtyByKey.get(`${business.category.slug}:${slug}`);
    if (!specialtyId) {
      skippedWrongCategory += 1;
      continue;
    }

    updated += 1;
    updates.push(prisma.business.update({ where: { id: business.id }, data: { specialtyId } }));
  }

  await Promise.all(updates);

  console.log(`Matched by phone: ${matched}`);
  console.log(`Updated with specialtyId: ${updated}`);
  console.log(`Skipped (specialty/category mismatch): ${skippedWrongCategory}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
