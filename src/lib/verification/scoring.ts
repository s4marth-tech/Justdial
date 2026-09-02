// Pure scoring for the business verification badge. No UI, no server
// actions, no database access — callers pass in already-computed
// per-category sub-scores (plus the raw rating signal) and get back a
// breakdown plus render-time display helpers. See scoring.test.ts for
// behavior.

// The only place the point values live. Every other number in this module
// (the 50-point max, the half-credit missing-rating default, the /10 and
// percentage display helpers) is derived from this object rather than
// re-typed.
export const VERIFICATION_SCORE_WEIGHTS = {
  expertise: 15,
  experience: 15,
  reviews: 10,
  ratings: 10,
} as const;

export type VerificationScoreCategory = keyof typeof VERIFICATION_SCORE_WEIGHTS;

export const VERIFICATION_SCORE_MAX = Object.values(VERIFICATION_SCORE_WEIGHTS).reduce(
  (sum, weight) => sum + weight,
  0
);

// A business with no rating data yet hasn't earned a bad score — it just
// hasn't been rated. Scoring it 0 would make a brand-new listing look worse
// than one with a single 1-star review, unfairly penalising new listings for
// not having accumulated reviews yet. Half credit keeps them neutral.
export const MISSING_RATING_SCORE = VERIFICATION_SCORE_WEIGHTS.ratings / 2;

// Business.avgRating is a 0-5 star scale — the ratings category scales that
// up to its own point weight.
const GOOGLE_RATING_SCALE_MAX = 5;

export type VerificationScoreInput = {
  expertise: number;
  experience: number;
  reviews: number;
  // Mirrors Business.avgRating and Business.reviewCount. avgRating defaults
  // to 0 for BOTH "never rated" and "genuinely rated 0.0" businesses, so it
  // can't be used on its own to detect "no rating data yet" — reviewCount is
  // the field that disambiguates. reviewCount === 0 is what triggers the
  // neutral MISSING_RATING_SCORE below; avgRating === 0 with reviewCount > 0
  // is a real, earned 0 and scores accordingly.
  avgRating: number;
  reviewCount: number;
};

export type VerificationScoreBreakdown = {
  expertise: number;
  experience: number;
  reviews: number;
  ratings: number;
  total: number;
};

function clamp(value: number, max: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(max, value));
}

// "No rating data yet" is a reviewCount check, not an avgRating check — see
// the VerificationScoreInput.avgRating comment above.
export function scoreRatingsCategory(avgRating: number, reviewCount: number): number {
  if (reviewCount === 0) return MISSING_RATING_SCORE;
  const scaled = (clamp(avgRating, GOOGLE_RATING_SCALE_MAX) / GOOGLE_RATING_SCALE_MAX) *
    VERIFICATION_SCORE_WEIGHTS.ratings;
  return clamp(scaled, VERIFICATION_SCORE_WEIGHTS.ratings);
}

export function scoreVerification(input: VerificationScoreInput): VerificationScoreBreakdown {
  const expertise = clamp(input.expertise, VERIFICATION_SCORE_WEIGHTS.expertise);
  const experience = clamp(input.experience, VERIFICATION_SCORE_WEIGHTS.experience);
  const reviews = clamp(input.reviews, VERIFICATION_SCORE_WEIGHTS.reviews);
  const ratings = scoreRatingsCategory(input.avgRating, input.reviewCount);

  return {
    expertise,
    experience,
    reviews,
    ratings,
    total: expertise + experience + reviews + ratings,
  };
}

// Display helpers — derived at render time from the total, never persisted.
// Written as ratios against VERIFICATION_SCORE_MAX (currently 50) rather
// than the literal /5 and *2 they work out to, so they stay correct if the
// weights above ever change.
export function toOutOfTen(total: number): number {
  return (total / VERIFICATION_SCORE_MAX) * 10;
}

export function toPercentage(total: number): number {
  return (total / VERIFICATION_SCORE_MAX) * 100;
}

// Search-visibility ranking rule: a flat boost for listings whose
// verificationStatus is exactly "VERIFIED" — not proportional to score, and
// never derived from the numeric total. This module deliberately exposes
// only a boolean predicate, not a sort/compare function, so nothing
// downstream can rank search results by score value.
export const VERIFIED_STATUS = "VERIFIED";

export function getsSearchVisibilityBoost(verificationStatus: string | null | undefined): boolean {
  return verificationStatus === VERIFIED_STATUS;
}
