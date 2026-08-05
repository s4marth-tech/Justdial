import { z } from "zod";

export const businessSchema = z.object({
  name: z.string().min(2, "Name is too short").max(120),
  categoryId: z.string().min(1, "Select a category"),
  description: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number"),
  whatsapp: z
    .string()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  addressLine: z.string().min(3, "Address is too short").max(200),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type BusinessFormValues = z.infer<typeof businessSchema>;
