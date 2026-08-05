import { z } from "zod";

export const reviewSchema = z.object({
  businessId: z.string().min(1),
  rating: z.number().int().min(1, "Pick a rating").max(5),
  comment: z.string().max(1000).optional().or(z.literal("")),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;
