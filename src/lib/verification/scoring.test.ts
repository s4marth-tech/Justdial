// Run with: npx tsx --test src/lib/verification/scoring.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VERIFICATION_SCORE_WEIGHTS,
  VERIFICATION_SCORE_MAX,
  MISSING_RATING_SCORE,
  scoreVerification,
  scoreRatingsCategory,
  toOutOfTen,
  toPercentage,
  getsSearchVisibilityBoost,
} from "./scoring";

test("full marks: max sub-scores and a 5-star average with reviews sums to the full total", () => {
  const breakdown = scoreVerification({
    expertise: VERIFICATION_SCORE_WEIGHTS.expertise,
    experience: VERIFICATION_SCORE_WEIGHTS.experience,
    reviews: VERIFICATION_SCORE_WEIGHTS.reviews,
    avgRating: 5,
    reviewCount: 50,
  });

  assert.equal(breakdown.expertise, VERIFICATION_SCORE_WEIGHTS.expertise);
  assert.equal(breakdown.experience, VERIFICATION_SCORE_WEIGHTS.experience);
  assert.equal(breakdown.reviews, VERIFICATION_SCORE_WEIGHTS.reviews);
  assert.equal(breakdown.ratings, VERIFICATION_SCORE_WEIGHTS.ratings);
  assert.equal(breakdown.total, VERIFICATION_SCORE_MAX);
  assert.equal(toOutOfTen(breakdown.total), 10);
  assert.equal(toPercentage(breakdown.total), 100);
});

test("all zero: a genuinely 0.0-rated business (reviewCount > 0) sums to 0, not the neutral score", () => {
  const breakdown = scoreVerification({
    expertise: 0,
    experience: 0,
    reviews: 0,
    avgRating: 0,
    reviewCount: 3,
  });

  assert.equal(breakdown.expertise, 0);
  assert.equal(breakdown.experience, 0);
  assert.equal(breakdown.reviews, 0);
  assert.equal(breakdown.ratings, 0);
  assert.equal(breakdown.total, 0);
  assert.equal(toOutOfTen(breakdown.total), 0);
  assert.equal(toPercentage(breakdown.total), 0);
});

test("missing rating: reviewCount === 0 scores the neutral half credit, not zero", () => {
  const breakdown = scoreVerification({
    expertise: 0,
    experience: 0,
    reviews: 0,
    avgRating: 0,
    reviewCount: 0,
  });

  assert.equal(breakdown.ratings, MISSING_RATING_SCORE);
  assert.equal(MISSING_RATING_SCORE, VERIFICATION_SCORE_WEIGHTS.ratings / 2);
  assert.notEqual(breakdown.ratings, 0);
  assert.equal(breakdown.total, MISSING_RATING_SCORE);
});

// The specific disambiguation this module has to get right: avgRating alone
// can't tell "never rated" apart from "rated, and it's a genuine 0.0" — both
// report avgRating === 0. reviewCount is the only reliable signal.
test("reviewCount, not avgRating, decides whether a 0.0 average is 'no data' or a real rating", () => {
  const neverRated = scoreRatingsCategory(0, 0);
  const genuinelyZero = scoreRatingsCategory(0, 12);

  assert.equal(neverRated, MISSING_RATING_SCORE);
  assert.equal(genuinelyZero, 0);
  assert.notEqual(neverRated, genuinelyZero);
});

test("clamps out-of-range sub-scores to each category's weight", () => {
  const breakdown = scoreVerification({
    expertise: 999,
    experience: -10,
    reviews: VERIFICATION_SCORE_WEIGHTS.reviews,
    avgRating: 999,
    reviewCount: 10,
  });

  assert.equal(breakdown.expertise, VERIFICATION_SCORE_WEIGHTS.expertise);
  assert.equal(breakdown.experience, 0);
  assert.equal(breakdown.ratings, VERIFICATION_SCORE_WEIGHTS.ratings);
});

test("search visibility boost is a flat gate on VERIFIED status, not derived from score", () => {
  assert.equal(getsSearchVisibilityBoost("VERIFIED"), true);
  assert.equal(getsSearchVisibilityBoost("PENDING"), false);
  assert.equal(getsSearchVisibilityBoost(null), false);
  assert.equal(getsSearchVisibilityBoost(undefined), false);
});
