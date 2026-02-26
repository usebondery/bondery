export type SocialActionKey =
  | "phone"
  | "email"
  | "linkedin"
  | "instagram"
  | "whatsapp"
  | "facebook"
  | "signal";

export const SOCIAL_ACTION_ORDER: SocialActionKey[] = [
  "phone",
  "email",
  "linkedin",
  "instagram",
  "whatsapp",
  "facebook",
  "signal",
];

function normalizeFirstName(firstName: string | null | undefined): string {
  const trimmed = String(firstName || "").trim();
  return trimmed.length > 0 ? trimmed : "contact";
}

/**
 * Returns consistent social-action tooltip wording across person view and table rows.
 */
export function getSocialActionTooltip(action: SocialActionKey, firstName: string): string {
  const normalizedFirstName = normalizeFirstName(firstName);

  switch (action) {
    case "phone":
      return `Call ${normalizedFirstName}`;
    case "email":
      return `Send email to ${normalizedFirstName}`;
    case "linkedin":
      return `Open ${normalizedFirstName} on LinkedIn`;
    case "instagram":
      return `Open ${normalizedFirstName} on Instagram`;
    case "whatsapp":
      return `Open ${normalizedFirstName} on WhatsApp`;
    case "facebook":
      return `Open ${normalizedFirstName} on Facebook`;
    case "signal":
      return `Open ${normalizedFirstName} on Signal`;
    default:
      return normalizedFirstName;
  }
}
