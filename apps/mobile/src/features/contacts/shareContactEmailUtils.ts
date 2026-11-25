import { emailAddressSchema } from "@bondery/schemas";

const MAX_SHARE_RECIPIENTS = 10;
const MAX_SHARE_MESSAGE_LENGTH = 2000;
const MESSAGE_LENGTH_COUNTER_THRESHOLD = 1800;

const RECIPIENT_SPLIT_REGEX = /[\s,;]+/u;

function parseRecipientTokens(text: string): string[] {
  return text
    .split(RECIPIENT_SPLIT_REGEX)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function isValidRecipientEmail(email: string): boolean {
  return emailAddressSchema.safeParse(email).success;
}

type ProcessRecipientInputResult =
  | { type: "single"; value: string }
  | {
      type: "multi";
      added: string[];
      remainder: string;
      hasInvalid: boolean;
    };

function processRecipientInputChange(
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

  return { added, hasInvalid, remainder, type: "multi" };
}

function buildFinalRecipients(recipients: string[], emailInput: string): string[] {
  const trimmed = emailInput.trim().toLowerCase();

  if (trimmed && isValidRecipientEmail(trimmed) && !recipients.includes(trimmed)) {
    return [...recipients, trimmed];
  }

  return recipients;
}

function formatShareEmailSendButtonLabel(
  count: number,
  t: (key: "SendButton" | "SendButtonOne" | "SendButtonMany") => string,
): string {
  if (count <= 0) {
    return t("SendButton");
  }

  if (count === 1) {
    return t("SendButtonOne");
  }

  return t("SendButtonMany").replace("{count}", String(count));
}

export type { ProcessRecipientInputResult };
export {
  buildFinalRecipients,
  formatShareEmailSendButtonLabel,
  isValidRecipientEmail,
  MAX_SHARE_MESSAGE_LENGTH,
  MAX_SHARE_RECIPIENTS,
  MESSAGE_LENGTH_COUNTER_THRESHOLD,
  parseRecipientTokens,
  processRecipientInputChange,
};
