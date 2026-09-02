// Plain, editable config for the business verification questionnaire.
// Wording is a first draft — not final, expect revisions. Each question is
// tagged with the scoring category it feeds (see scoring.ts). "ratings"
// isn't a valid tag here: that category is computed automatically from
// Business.avgRating/reviewCount, never self-reported by the owner.

import type { VerificationScoreCategory } from "./scoring";

export type VerificationQuestionCategory = Exclude<VerificationScoreCategory, "ratings">;

export type VerificationQuestionType = "text" | "textarea" | "number";

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
  },
  {
    id: "specialisation",
    category: "expertise",
    label: "What do you specialise in?",
    description: "A short description of your focus area within your profession.",
    type: "text",
    placeholder: "e.g. Corporate tax filings for small businesses",
    required: true,
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
