import { z } from "zod";

export const claimSchema = z.object({
  businessId: z.string().min(1),
  note: z.string().max(1000).optional().or(z.literal("")),
});

export type ClaimFormValues = z.infer<typeof claimSchema>;
