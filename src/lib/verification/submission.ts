// Zod schema for a verification questionnaire submission, built from the
// VERIFICATION_QUESTIONS config so validation can never drift from the
// actual question set — add/remove a question there and this follows.

import { z } from "zod";
import { VERIFICATION_QUESTIONS } from "./questions";

const answersShape = Object.fromEntries(
  VERIFICATION_QUESTIONS.map((question) => [
    question.id,
    question.required
      ? z.string().trim().min(1, `${question.label} is required.`)
      : z.string().trim(),
  ])
);

export const verificationSubmissionSchema = z.object({
  businessId: z.string().min(1),
  answers: z.object(answersShape),
});

export type VerificationSubmissionFormValues = z.infer<typeof verificationSubmissionSchema>;
