// Zod schema for a verification questionnaire submission, built from the
// VERIFICATION_QUESTIONS config so validation can never drift from the
// actual question set — add/remove a question there and this follows.

import { z } from "zod";
import { VERIFICATION_QUESTIONS, resolveQuestionText } from "./questions";

const answersShape = Object.fromEntries(
  VERIFICATION_QUESTIONS.map((question) => [
    question.id,
    question.required
      ? z.string().trim().min(1, `${question.label} is required.`)
      : z.string().trim(),
  ])
);

// What the form actually submits: raw values keyed by question id.
export const verificationSubmissionSchema = z.object({
  businessId: z.string().min(1),
  answers: z.object(answersShape),
});

export type VerificationSubmissionFormValues = z.infer<typeof verificationSubmissionSchema>;

// What gets stored in VerificationSubmission.answers (Json): each raw value
// paired with the exact question text it was asked under, at submission
// time. Plain `{ id: value }` has no record of what the question actually
// said — if wording changes later (see resolveQuestionText's category
// overrides) or a question is ever reworded outright, an admin reviewing an
// old submission would have no way to know what was really asked. This
// makes every submission self-describing regardless of how questions.ts
// evolves after the fact.
//
// The "question" text is always derived here, server-side, from the current
// config + the business's own category — never trusted from client input —
// so a submission's snapshot is guaranteed to reflect a real question that
// was actually shown, not arbitrary client-supplied text.
export type VerificationAnswerRecord = {
  question: string;
  value: string;
};

export type VerificationStoredAnswers = Record<string, VerificationAnswerRecord>;

export function buildStoredAnswers(
  rawAnswers: Record<string, string>,
  categorySlug: string | null | undefined
): VerificationStoredAnswers {
  const stored: VerificationStoredAnswers = {};
  for (const question of VERIFICATION_QUESTIONS) {
    const { label } = resolveQuestionText(question, categorySlug);
    stored[question.id] = {
      question: label,
      value: rawAnswers[question.id] ?? "",
    };
  }
  return stored;
}
