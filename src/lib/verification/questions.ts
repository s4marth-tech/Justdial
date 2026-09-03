// Plain, editable config for the business verification questionnaire.
// Wording is a first draft — not final, expect revisions. Each question is
// tagged with the scoring category it feeds (see scoring.ts). "ratings"
// isn't a valid tag here: that category is computed automatically from
// Business.avgRating/reviewCount, never self-reported by the owner.

import type { VerificationScoreCategory } from "./scoring";

export type VerificationQuestionCategory = Exclude<VerificationScoreCategory, "ratings">;

export type VerificationQuestionType = "text" | "textarea" | "number";

// The three categories with real businesses right now (see
// src/lib/categories.ts's LAD_CATEGORY_SLUGS). Kept as its own literal type
// here rather than imported, so this config stays self-contained — a plain
// string key that misses this union just falls back to the generic wording.
export type VerificationCategorySlug = "lawyers" | "accountants" | "doctors";

export type VerificationQuestionTextOverride = Partial<
  Pick<VerificationQuestion, "label" | "description" | "placeholder">
>;

export type VerificationQuestion = {
  // Stable key this answer is stored under in VerificationSubmission.answers
  // (a Json blob). Don't rename an existing id once real submissions exist —
  // it would silently orphan that answer in past records.
  id: string;
  category: VerificationQuestionCategory;
  label: string;
  description?: string;
  type: VerificationQuestionType;
  placeholder?: string;
  required: boolean;
  // Wording tailored to the business's own listing category — e.g. a lawyer
  // and an accountant mean completely different things by "registration
  // number". Falls back to the generic label/description/placeholder above
  // for any category not listed here (including the 8 categories that exist
  // in the schema but have no real businesses yet).
  categoryOverrides?: Partial<Record<VerificationCategorySlug, VerificationQuestionTextOverride>>;
};

export const VERIFICATION_QUESTIONS: VerificationQuestion[] = [
  {
    id: "registrationNumber",
    category: "expertise",
    label: "Professional registration or license number",
    description:
      "e.g. Bar Council enrolment number, ICAI membership number, or medical council registration number.",
    type: "text",
    placeholder: "e.g. D/1234/2015",
    required: true,
    categoryOverrides: {
      lawyers: {
        label: "Bar Council enrolment number",
        description:
          "Your State Bar Council enrolment number (as issued by the Bar Council of India / your state bar council).",
        placeholder: "e.g. D/1234/2015",
      },
      doctors: {
        label: "Medical registration number",
        description: "Your NMC (National Medical Commission) or state medical council registration number.",
        placeholder: "e.g. DMC/12345/2008",
      },
      accountants: {
        label: "ICAI membership number",
        description: "Your Institute of Chartered Accountants of India (ICAI) membership number.",
        placeholder: "e.g. M-118432",
      },
    },
  },
  {
    id: "specialisation",
    category: "expertise",
    label: "What do you specialise in?",
    description: "A short description of your focus area within your profession.",
    type: "text",
    placeholder: "e.g. Corporate tax filings for small businesses",
    required: true,
    categoryOverrides: {
      lawyers: { placeholder: "e.g. Property disputes and family law" },
      doctors: { placeholder: "e.g. General medicine and diabetes management" },
      accountants: { placeholder: "e.g. GST filing and small-business tax advisory" },
    },
  },
  {
    id: "credentials",
    category: "expertise",
    label: "Notable credentials, degrees, or certifications",
    description: "Degrees, board certifications, awards, published work — anything that backs up your expertise.",
    type: "textarea",
    placeholder: "e.g. MBBS, MD (Cardiology) — AIIMS Delhi, 2010",
    required: false,
  },
  {
    id: "yearsPractising",
    category: "experience",
    label: "How many years have you been practising?",
    type: "number",
    placeholder: "e.g. 8",
    required: true,
  },
  {
    id: "notableWork",
    category: "experience",
    label: "Notable clients, cases, or projects you've handled",
    description: "A few examples that show the depth of your track record. No confidential details needed.",
    type: "textarea",
    placeholder: "e.g. Handled 200+ property registration cases in Noida since 2018",
    required: false,
    categoryOverrides: {
      lawyers: { placeholder: "e.g. Handled 150+ property registration cases across Delhi NCR" },
      doctors: {
        placeholder: "e.g. Runs a daily OPD seeing 40+ patients; volunteers at community health camps",
      },
      accountants: { placeholder: "e.g. Manages annual filings for 60+ small-business clients" },
    },
  },
  {
    id: "externalValidation",
    category: "reviews",
    label: "Links to reviews, testimonials, or references we can verify",
    description: "Google Business reviews, your Justdial listing, LinkedIn recommendations, or references we can contact.",
    type: "textarea",
    placeholder: "e.g. https://g.page/r/...",
    required: false,
  },
];

// Resolves the effective label/description/placeholder for a question
// against a business's own category slug, falling back to the generic
// wording above when there's no override (or no/unknown category).
export function resolveQuestionText(
  question: VerificationQuestion,
  categorySlug: string | null | undefined
): { label: string; description?: string; placeholder?: string } {
  const override = categorySlug
    ? question.categoryOverrides?.[categorySlug as VerificationCategorySlug]
    : undefined;
  return {
    label: override?.label ?? question.label,
    description: override?.description ?? question.description,
    placeholder: override?.placeholder ?? question.placeholder,
  };
}
