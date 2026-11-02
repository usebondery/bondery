import { buildApiErrorFromResponse, extractApiErrorFields, isApiError } from "@bondery/helpers/api";

/**
 * Turns a chat transport failure into an API error.
 *
 * `DefaultChatTransport` throws with the response body inside the message, so
 * the JSON payload is extracted before the API error shape is built.
 */

function jsonPayloadFromTransportError(error: unknown): string {
  const bodyText = error instanceof Error ? error.message : String(error);
  const jsonStart = bodyText.indexOf("{");
  const jsonEnd = bodyText.lastIndexOf("}");

  return jsonStart >= 0 && jsonEnd > jsonStart ? bodyText.slice(jsonStart, jsonEnd + 1) : bodyText;
}

export function chatTransportErrorToApiError(error: unknown) {
  const bodyText = jsonPayloadFromTransportError(error);
  const fields = extractApiErrorFields(bodyText);

  if (!fields.code) {
    return error;
  }

  const status =
    fields.code === "chat_quota_exceeded" ? 403 : fields.code === "service_unavailable" ? 503 : 500;

  return buildApiErrorFromResponse({ bodyText, status });
}

/** True when the failure is the monthly chat quota. */
export function isChatQuotaError(error: unknown): boolean {
  const apiError = chatTransportErrorToApiError(error);

  return (
    (isApiError(apiError) &&
      (apiError.code === "chat_quota_exceeded" || apiError.status === 403)) ||
    (error instanceof Error && error.message.includes("403"))
  );
}

export function chatQuotaResetAt(error: unknown): string | undefined {
  const bodyText = jsonPayloadFromTransportError(error);

  try {
    const parsed = JSON.parse(bodyText) as { error?: { details?: { resetAt?: unknown } } };
    return typeof parsed.error?.details?.resetAt === "string"
      ? parsed.error.details.resetAt
      : undefined;
  } catch {
    return undefined;
  }
}
