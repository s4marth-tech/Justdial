import { Resend } from "resend";

type NewLeadNotification = {
  ownerEmail: string | null;
  ownerName: string | null;
  emailNotificationsEnabled: boolean;
  businessName: string;
  leadType: "ENQUIRY" | "CALL" | "CALLBACK_REQUEST";
  leadName: string;
  leadPhone: string;
  leadMessage?: string | null;
};

const LEAD_TYPE_SUBJECT: Record<NewLeadNotification["leadType"], string> = {
  ENQUIRY: "You have a new enquiry on",
  CALLBACK_REQUEST: "You have a new callback request on",
  CALL: "Someone viewed your number on",
};

const LEAD_TYPE_DESCRIPTION: Record<NewLeadNotification["leadType"], string> = {
  ENQUIRY: "sent an enquiry",
  CALLBACK_REQUEST: "requested a callback",
  CALL: "viewed your phone number",
};

/**
 * Notifies a business owner about a new lead. Fully implemented against
 * Resend (already an installed dependency) but gated on RESEND_API_KEY —
 * until that's set in .env, it logs instead of sending so the rest of the
 * lead-creation flow never breaks or silently no-ops without a trace.
 */
export async function notifyOwnerOfNewLead(
  notification: NewLeadNotification
): Promise<{ sent: boolean; reason?: string }> {
  if (!notification.emailNotificationsEnabled) {
    console.log(
      `[notifyOwnerOfNewLead] "${notification.businessName}" owner has disabled email notifications — skipping.`
    );
    return { sent: false, reason: "notifications_disabled" };
  }

  if (!notification.ownerEmail) {
    console.log(
      `[notifyOwnerOfNewLead] "${notification.businessName}" has no owner on file — skipping notification.`
    );
    return { sent: false, reason: "no_owner_email" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[notifyOwnerOfNewLead] RESEND_API_KEY not set — would have emailed ${notification.ownerEmail} ` +
        `about a new ${notification.leadType} lead on "${notification.businessName}". Skipping send.`
    );
    return { sent: false, reason: "not_configured" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const dashboardUrl = `${siteUrl}/dashboard/leads`;
  const greeting = notification.ownerName ? `Hi ${notification.ownerName},` : "Hi,";
  const messageLine = notification.leadMessage
    ? `\n\nTheir message: "${notification.leadMessage}"`
    : "";

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "JustDial <onboarding@resend.dev>",
      to: notification.ownerEmail,
      subject: `${LEAD_TYPE_SUBJECT[notification.leadType]} ${notification.businessName}`,
      text:
        `${greeting}\n\n${notification.leadName} (${notification.leadPhone}) just ` +
        `${LEAD_TYPE_DESCRIPTION[notification.leadType]} on ${notification.businessName}.` +
        `${messageLine}\n\nView it in your leads dashboard: ${dashboardUrl}\n`,
    });
    return { sent: true };
  } catch (error) {
    console.error("[notifyOwnerOfNewLead] Failed to send email:", error);
    return { sent: false, reason: "send_failed" };
  }
}
