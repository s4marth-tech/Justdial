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
      from: "My Lads <onboarding@resend.dev>",
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

type ClaimOutcomeNotification = {
  claimantEmail: string | null;
  claimantName: string | null;
  businessName: string;
  businessSlug: string;
  // "rejectedSuperseded" is distinct from a manual "rejected" — the claim
  // was never actually reviewed against its merits, it lost a race to
  // another claim on the same business that an admin approved first. The
  // claimant gets an accurate reason either way, not a generic rejection.
  outcome: "approved" | "rejected" | "rejectedSuperseded";
};

const CLAIM_OUTCOME_SUBJECT: Record<ClaimOutcomeNotification["outcome"], string> = {
  approved: "Your claim was approved",
  rejected: "Your claim was not approved",
  rejectedSuperseded: "Your claim was not approved",
};

/**
 * Notifies a claimant of the outcome of their "claim this business" request.
 * Same gated-send pattern as notifyOwnerOfNewLead (real send if
 * RESEND_API_KEY is set, logged stub otherwise) — kept as a separate
 * function rather than a shared one since the audience and content are
 * different, but deliberately mirrors that structure rather than inventing
 * a new one.
 */
export async function notifyClaimOutcome(
  notification: ClaimOutcomeNotification
): Promise<{ sent: boolean; reason?: string }> {
  if (!notification.claimantEmail) {
    console.log(
      `[notifyClaimOutcome] No email on file for the claimant of "${notification.businessName}" — skipping notification.`
    );
    return { sent: false, reason: "no_claimant_email" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[notifyClaimOutcome] RESEND_API_KEY not set — would have emailed ${notification.claimantEmail} ` +
        `that their claim on "${notification.businessName}" was ${notification.outcome}. Skipping send.`
    );
    return { sent: false, reason: "not_configured" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const greeting = notification.claimantName ? `Hi ${notification.claimantName},` : "Hi,";

  let body: string;
  if (notification.outcome === "approved") {
    body =
      `${greeting}\n\nYour claim on ${notification.businessName} has been approved. ` +
      `You're now the verified owner of this listing and can manage it, respond to leads, ` +
      `and update its details from your dashboard: ${siteUrl}/dashboard/businesses\n`;
  } else if (notification.outcome === "rejectedSuperseded") {
    body =
      `${greeting}\n\nYour claim on ${notification.businessName} was not approved — another ` +
      `claim on this business was reviewed and approved first, so it already has a verified ` +
      `owner. If you believe that's incorrect, you're welcome to get in touch.\n`;
  } else {
    body =
      `${greeting}\n\nAfter review, we weren't able to approve your claim on ` +
      `${notification.businessName}. If you believe this is a mistake, you're welcome to submit ` +
      `a new claim with more detail: ${siteUrl}/business/${notification.businessSlug}\n`;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "My Lads <onboarding@resend.dev>",
      to: notification.claimantEmail,
      subject: `${CLAIM_OUTCOME_SUBJECT[notification.outcome]} — ${notification.businessName}`,
      text: body,
    });
    return { sent: true };
  } catch (error) {
    console.error("[notifyClaimOutcome] Failed to send email:", error);
    return { sent: false, reason: "send_failed" };
  }
}
