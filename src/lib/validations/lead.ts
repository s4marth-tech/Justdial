import { z } from "zod";

// Indian mobile numbers: 10 digits starting 6-9, optionally prefixed with
// +91 / 91 / 0. Spaces and dashes are stripped before matching so display
// formats like "+91 98200 11111" still validate.
const INDIAN_MOBILE_REGEX = /^(?:\+91|91|0)?[6-9]\d{9}$/;

function normalizePhone(phone: string) {
  return phone.replace(/[\s-]/g, "");
}

export const leadSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(2, "Name is too short").max(100),
  phone: z
    .string()
    .refine((value) => INDIAN_MOBILE_REGEX.test(normalizePhone(value)), {
      message: "Enter a valid 10-digit Indian mobile number",
    }),
  message: z.string().max(1000).optional().or(z.literal("")),
  type: z.enum(["ENQUIRY", "CALL", "CALLBACK_REQUEST"]),
  // Honeypot: real visitors never see or fill this field. Anything non-empty
  // here means a bot filled every input it could find — createLead drops
  // the submission silently rather than erroring.
  honeypot: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

// Same name/phone/message/honeypot rules as leadSchema (reused via .pick,
// not reimplemented) — a broadcast submission targets a category+city
// instead of one specific business, so those two fields replace
// businessId+type.
export const broadcastLeadSchema = leadSchema
  .pick({ name: true, phone: true, message: true, honeypot: true })
  .extend({
    category: z.string().min(1),
    city: z.string().min(1),
  });

export type BroadcastLeadFormValues = z.infer<typeof broadcastLeadSchema>;
