// One-off seed: gives the verification badge and search-boost work
// something real to look at. Zero businesses were VERIFIED before this ran,
// so neither could be eyeballed. Creates a handful of PENDING
// VerificationSubmission rows (nothing scored yet, same as a real owner
// submission) plus marks a couple of businesses VERIFIED with a plausible,
// actually-computed score breakdown (via scoreVerification from
// src/lib/verification/scoring.ts, not hand-typed numbers).
//
// Not part of the main seed (prisma/seed.ts) — run directly, same pattern as
// prisma/backfill-specialty.ts and prisma/import-scraped.ts. CLAUDE.md notes
// `npx prisma db seed` is required for prisma/seed.ts specifically because
// prisma.config.ts is what loads dotenv for that command; this script loads
// its own env below, so plain tsx works fine here.
//
// Usage:
//   npx tsx prisma/seed-verification.ts

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { scoreVerification, VERIFICATION_SCORE_WEIGHTS } from "@/lib/verification/scoring";
import { VERIFICATION_QUESTIONS } from "@/lib/verification/questions";
import { buildStoredAnswers } from "@/lib/verification/submission";

const VERIFIED_COUNT = 3;
const PENDING_COUNT = 5;

// One realistic answer set per category slug, keyed by the actual
// VERIFICATION_QUESTIONS ids so these look exactly like what the real form
// produces. Falls back to a generic set for any category without one.
const SAMPLE_ANSWERS_BY_CATEGORY: Record<string, Record<string, string>> = {
  lawyers: {
    registrationNumber: "BCI/DL/2011/04521",
    specialisation: "Property disputes and family law",
    credentials: "LLB, Delhi University (2009); enrolled with the Bar Council of Delhi",
    yearsPractising: "14",
    notableWork: "Handled 150+ property registration and succession cases across Delhi NCR",
    externalValidation: "https://g.page/r/CXXXXXXXXXXXX",
  },
  accountants: {
    registrationNumber: "ICAI/M-118432",
    specialisation: "GST filing and small-business tax advisory",
    credentials: "Chartered Accountant, ICAI (2015); Diploma in Information Systems Audit",
    yearsPractising: "9",
    notableWork: "Manages annual filings for 60+ small-business clients across NCR",
    externalValidation: "https://www.linkedin.com/in/example-ca",
  },
  doctors: {
    registrationNumber: "DMC/12345/2008",
    specialisation: "General medicine and diabetes management",
    credentials: "MBBS, MD (General Medicine) — Maulana Azad Medical College, 2007",
    yearsPractising: "17",
    notableWork: "Runs a daily OPD seeing 40+ patients; volunteers at community health camps",
    externalValidation: "https://g.page/r/CYYYYYYYYYYYY",
  },
};

const GENERIC_SAMPLE_ANSWERS: Record<string, string> = {
  registrationNumber: "REG/2016/00847",
  specialisation: "General practice within the field",
  credentials: "Relevant degree and professional body membership",
  yearsPractising: "10",
  notableWork: "Steady client base built up over a decade of practice",
  externalValidation: "https://g.page/r/CZZZZZZZZZZZZ",
};

// Sanity check, not a data source: fails loudly if questions.ts is ever
// edited without updating the sample sets above, instead of silently
// seeding answers that don't match the current question config.
function buildSampleAnswers(categorySlug: string): Record<string, string> {
  const sample = SAMPLE_ANSWERS_BY_CATEGORY[categorySlug] ?? GENERIC_SAMPLE_ANSWERS;
  const missing = VERIFICATION_QUESTIONS.filter((q) => !(q.id in sample));
  if (missing.length > 0) {
    throw new Error(
      `Sample answers for "${categorySlug}" are missing ids: ${missing.map((q) => q.id).join(", ")}. ` +
        `Update the sample sets in prisma/seed-verification.ts to match src/lib/verification/questions.ts.`
    );
  }
  return sample;
}

// A few distinct plausible sub-score sets so the VERIFIED businesses don't
// all look identical — a strong one, a solid one, a borderline-but-passing
// one. Ratings are deliberately NOT included here: they come from the
// business's own real avgRating/reviewCount, same as scoreVerification
// expects in production.
const PLAUSIBLE_SUB_SCORES = [
  { expertise: 14, experience: 14, reviews: 9 },
  { expertise: 12, experience: 11, reviews: 8 },
  { expertise: 10, experience: 9, reviews: 6 },
];

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });

  // Only businesses with no VerificationSubmission yet, so this script is
  // safe to run more than once without piling up duplicate rows.
  const candidates = await prisma.business.findMany({
    where: { status: "APPROVED", verificationSubmissions: { none: {} } },
    select: {
      id: true,
      name: true,
      avgRating: true,
      reviewCount: true,
      category: { select: { slug: true } },
    },
    orderBy: { createdAt: "asc" },
    take: VERIFIED_COUNT + PENDING_COUNT,
  });

  if (candidates.length === 0) {
    console.log("No eligible businesses found (all APPROVED businesses already have a submission). Nothing to do.");
    return;
  }
  if (candidates.length < VERIFIED_COUNT + PENDING_COUNT) {
    console.warn(
      `Only ${candidates.length} eligible businesses available (wanted ${VERIFIED_COUNT + PENDING_COUNT}) — seeding as many as there are.`
    );
  }

  const verifiedTargets = candidates.slice(0, VERIFIED_COUNT);
  const pendingTargets = candidates.slice(VERIFIED_COUNT, VERIFIED_COUNT + PENDING_COUNT);

  let verifiedCreated = 0;
  for (const [index, business] of verifiedTargets.entries()) {
    // Same shaping the real submission flow uses (buildStoredAnswers), so
    // seeded rows are structurally identical to what an owner's own
    // submission produces — question text snapshotted per the business's
    // category, not just a raw id->value map.
    const answers = buildStoredAnswers(buildSampleAnswers(business.category.slug), business.category.slug);
    const subScores = PLAUSIBLE_SUB_SCORES[index % PLAUSIBLE_SUB_SCORES.length];
    const breakdown = scoreVerification({
      ...subScores,
      avgRating: business.avgRating,
      reviewCount: business.reviewCount,
    });
    const reviewedAt = new Date();

    await prisma.$transaction([
      prisma.verificationSubmission.create({
        data: {
          businessId: business.id,
          answers,
          scoreBreakdown: breakdown,
          status: "VERIFIED",
          reviewedByUserId: admin?.id,
          reviewedAt,
        },
      }),
      prisma.business.update({
        where: { id: business.id },
        data: {
          verificationStatus: "VERIFIED",
          verificationScore: breakdown.total,
          verifiedAt: reviewedAt,
        },
      }),
    ]);

    console.log(
      `VERIFIED  ${business.name} — score ${breakdown.total}/${VERIFICATION_SCORE_WEIGHTS.expertise + VERIFICATION_SCORE_WEIGHTS.experience + VERIFICATION_SCORE_WEIGHTS.reviews + VERIFICATION_SCORE_WEIGHTS.ratings}`
    );
    verifiedCreated += 1;
  }

  let pendingCreated = 0;
  for (const business of pendingTargets) {
    const answers = buildStoredAnswers(buildSampleAnswers(business.category.slug), business.category.slug);

    await prisma.$transaction([
      prisma.verificationSubmission.create({
        data: {
          businessId: business.id,
          answers,
          status: "PENDING",
        },
      }),
      prisma.business.update({
        where: { id: business.id },
        data: { verificationStatus: "PENDING" },
      }),
    ]);

    console.log(`PENDING   ${business.name}`);
    pendingCreated += 1;
  }

  console.log(`\nDone — ${verifiedCreated} verified, ${pendingCreated} pending submission(s) created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
