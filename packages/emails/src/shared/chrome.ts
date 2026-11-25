export const EMAIL_PREVIEW_MAX_CHARS = 90;

export function clipEmailPreview(value: string, max: number = EMAIL_PREVIEW_MAX_CHARS): string {
  const trimmed = value.replace(/\s+/gu, " ").trim();
  if (trimmed.length <= max) {
    return trimmed;
  }

  if (max <= 1) {
    return "…";
  }

  return `${trimmed.slice(0, max - 1)}…`;
}

export type EmailChromeCopy = {
  documentation: string;
  help: string;
  internalNote: string;
  logoAlt: string;
  manageNotifications: string;
  support: string;
};

export const defaultEmailChromeCopy: EmailChromeCopy = {
  documentation: "documentation",
  help: "Need help? Visit {{support}} or read our {{documentation}}.",
  internalNote: "Internal ops · not sent to the customer",
  logoAlt: "Bondery",
  manageNotifications: "Manage these notifications in Bondery",
  support: "support",
};

export type EmailDocumentProps = {
  chrome?: EmailChromeCopy;
  dir?: "ltr" | "rtl";
  lang?: string;
  /** Settings URL for product mail the user can turn off (reminder digest). */
  manageNotificationsUrl?: string;
  showHelp?: boolean;
  /**
   * Legal name + registered address. Default false (transactional).
   * Set true only for marketing / promotional mail.
   */
  showLegalEntity?: boolean;
  title?: string;
  websiteUrl?: string;
};

export const DEFAULT_WEBSITE_URL = "https://usebondery.com";
export const DEFAULT_APP_URL = "https://app.usebondery.com";
