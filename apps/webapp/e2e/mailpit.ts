/**
 * Mailpit HTTP helpers for Playwright.
 *
 * Search by recipient. Extract `/auth/magic-link/verify` from HTML or text.
 * First signup also sends welcome mail — do not take the latest message.
 */

import { expect } from "@playwright/test";

const MAILPIT_BASE_URL = "http://127.0.0.1:26641";
const VERIFY_PATH = "/auth/magic-link/verify";

type MailpitMessageSummary = {
  Created?: string;
  ID: string;
  Snippet?: string;
};

type MailpitSearchResponse = {
  messages?: MailpitMessageSummary[];
};

type MailpitMessage = {
  HTML?: string;
  Text?: string;
};

function extractVerifyUrl(content: string): string | undefined {
  const decoded = content.replaceAll("&amp;", "&");
  const pathIndex = decoded.indexOf(VERIFY_PATH);
  if (pathIndex === -1) {
    return undefined;
  }

  const start = decoded.lastIndexOf("http", pathIndex);
  if (start === -1) {
    return undefined;
  }

  let end = pathIndex + VERIFY_PATH.length;
  while (end < decoded.length && !/[\s"'<>]/.test(decoded[end] ?? "")) {
    end += 1;
  }

  return decoded.slice(start, end);
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${MAILPIT_BASE_URL}${path}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Mailpit ${path} returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function findMagicLinkVerifyUrl(
  to: string,
  receivedAfter?: Date,
): Promise<string | undefined> {
  const search = await fetchJson<MailpitSearchResponse>(
    `/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
  );
  const messages = [...(search.messages ?? [])].sort((left, right) => {
    const leftTime = left.Created ? Date.parse(left.Created) : 0;
    const rightTime = right.Created ? Date.parse(right.Created) : 0;
    return rightTime - leftTime;
  });

  const afterMs = receivedAfter ? receivedAfter.getTime() - 5_000 : undefined;

  for (const summary of messages) {
    if (afterMs !== undefined && summary.Created) {
      const createdMs = Date.parse(summary.Created);
      if (!Number.isNaN(createdMs) && createdMs < afterMs) {
        continue;
      }
    }

    const snippetUrl = summary.Snippet ? extractVerifyUrl(summary.Snippet) : undefined;
    if (snippetUrl) {
      return snippetUrl;
    }

    const message = await fetchJson<MailpitMessage>(`/api/v1/message/${summary.ID}`);
    const fromHtml = message.HTML ? extractVerifyUrl(message.HTML) : undefined;
    if (fromHtml) {
      return fromHtml;
    }
    const fromText = message.Text ? extractVerifyUrl(message.Text) : undefined;
    if (fromText) {
      return fromText;
    }
  }

  return undefined;
}

/** Poll Mailpit until a magic-link verify URL exists for `to`. */
export async function waitForMagicLinkVerifyUrl(to: string, receivedAfter?: Date): Promise<string> {
  let found: string | undefined;

  await expect
    .poll(
      async () => {
        found = await findMagicLinkVerifyUrl(to, receivedAfter);
        return found ?? "";
      },
      { timeout: 30_000 },
    )
    .not.toBe("");

  if (!found) {
    throw new Error(`Mailpit has no magic-link verify URL for ${to}`);
  }

  return found;
}
