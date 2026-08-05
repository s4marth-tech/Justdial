import { z } from "zod";

export const mediaSchema = z.object({
  businessId: z.string().min(1),
  url: z.string().url(),
  publicId: z.string().min(1),
});

export type MediaFormValues = z.infer<typeof mediaSchema>;
