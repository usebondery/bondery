import { z } from "zod";

export const MAX_SHARE_RECIPIENTS = 10;
export const MAX_SHARE_MESSAGE_LENGTH = 2000;
export const MESSAGE_LENGTH_COUNTER_THRESHOLD = 1800;

const RECIPIENT_SPLIT_REGEX = /[\s,;]+/;
const recipientEmailSchema = z.string().trim().email();

export function parseRecipientTokens(text: string): string[] {
  return text
    .split(RECIPIENT_SPLIT_REGEX)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

export function isValidRecipientEmail(email: string): boolean {
  return recipientEmailSchema.safeParse(email).success;
}

export type ProcessRecipientInputResult =
  | { type: "single"; value: string }
  | {
      type: "multi";
      added: string[];
      remainder: string;
      hasInvalid: boolean;
    };

export function processRecipientInputChange(
  text: string,
  existingRecipients: string[],
  maxRecipients: number = MAX_SHARE_RECIPIENTS,
): ProcessRecipientInputResult {
  const tokens = parseRecipientTokens(text);

  if (tokens.length <= 1) {
    return { type: "single", value: text };
  }

  const added: string[] = [];
  const seen = new Set(existingRecipients);
  let hasInvalid = false;
  let remainder = "";

  for (const token of tokens) {
    if (!isValidRecipientEmail(token)) {
      hasInvalid = true;
      remainder = token;
      break;
    }

    if (seen.has(token)) {
      continue;
    }

    if (existingRecipients.length + added.length >= maxRecipients) {
      remainder = token;
      break;
    }

    added.push(token);
    seen.add(token);
  }

  return { type: "multi", added, remainder, hasInvalid };
}

export function buildFinalRecipients(
  recipients: string[],
  emailInput: string,
): string[] {
  const trimmed = emailInput.trim().toLowerCase();

  if (
    trimmed &&
    isValidRecipientEmail(trimmed) &&
    !recipients.includes(trimmed)
  ) {
    return [...recipients, trimmed];
  }

  return recipients;
}

export function formatShareEmailSendButtonLabel(
  count: number,
  t: (key: string) => string,
): string {
  if (count <= 0) {
    return t("MobileApp.ShareContactEmail.SendButton");
  }

  if (count === 1) {
    return t("MobileApp.ShareContactEmail.SendButtonOne");
  }

  return t("MobileApp.ShareContactEmail.SendButtonMany").replace("{count}", String(count));
}
