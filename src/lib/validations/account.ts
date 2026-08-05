import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(2, "Name is too short").max(100),
  phone: z
    .string()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// currentPassword is optional at the schema level because it's only required
// for accounts that already have a password (checked server-side, where we
// know whether one exists) — Google-only accounts are "setting" a password
// for the first time, not "changing" one, so there's nothing to verify yet.
export const passwordSchema = z
  .object({
    currentPassword: z.string().optional().or(z.literal("")),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type PasswordFormValues = z.infer<typeof passwordSchema>;

export const notificationPreferencesSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
});

export type NotificationPreferencesFormValues = z.infer<
  typeof notificationPreferencesSchema
>;
