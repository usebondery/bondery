import i18n from "../i18n/i18n";
import { isDeviceOffline } from "../network/isDeviceOffline";

const MAX_DISPLAYABLE_ERROR_LENGTH = 200;

type ApiErrorJson = {
  error?: unknown;
  message?: unknown;
};

function isHtmlLike(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return (
    trimmed.startsWith("<") ||
    trimmed.includes("<!doctype html") ||
    trimmed.includes("<html")
  );
}

function isDisplayablePlainText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.length > MAX_DISPLAYABLE_ERROR_LENGTH) {
    return false;
  }

  if (isHtmlLike(trimmed)) {
    return false;
  }

  if (trimmed.split("\n").length > 4) {
    return false;
  }

  return true;
}

function extractJsonErrorMessage(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as ApiErrorJson;
    const candidate =
      typeof parsed.error === "string"
        ? parsed.error
        : typeof parsed.message === "string"
          ? parsed.message
          : null;

    if (!candidate || !isDisplayablePlainText(candidate)) {
      return null;
    }

    return candidate.trim();
  } catch {
    return null;
  }
}

function shouldUseApiUnreachableFallback(
  status: number,
  contentType: string | null | undefined,
  bodyText: string,
): boolean {
  if (status === 502 || status === 503 || status === 504) {
    return true;
  }

  if (contentType?.toLowerCase().includes("text/html")) {
    return true;
  }

  return isHtmlLike(bodyText);
}

export async function resolveFetchFailureMessage(_error: unknown): Promise<string> {
  if (await isDeviceOffline()) {
    return i18n.t("MobileApp.Common.ConnectionError");
  }

  return i18n.t("MobileApp.Common.ApiUnreachableError");
}

export function resolveApiErrorMessage({
  status,
  bodyText,
  contentType,
}: {
  status: number;
  bodyText: string;
  contentType?: string | null;
}): string {
  const trimmedBody = bodyText.trim();

  const jsonMessage = extractJsonErrorMessage(trimmedBody);
  if (jsonMessage) {
    return jsonMessage;
  }

  if (isDisplayablePlainText(trimmedBody)) {
    return trimmedBody;
  }

  if (shouldUseApiUnreachableFallback(status, contentType, trimmedBody)) {
    return i18n.t("MobileApp.Common.ApiUnreachableError");
  }

  if (status >= 500) {
    return i18n.t("MobileApp.Common.ApiUnreachableError");
  }

  return i18n.t("MobileApp.Common.UnknownError");
}
