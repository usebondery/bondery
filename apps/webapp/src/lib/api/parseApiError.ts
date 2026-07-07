const MAX_DISPLAYABLE_ERROR_LENGTH = 200;

type ApiErrorJson = {
  error?: unknown;
  message?: unknown;
  code?: unknown;
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
  if (!trimmed || trimmed.length > MAX_DISPLAYABLE_ERROR_LENGTH) {
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

export function extractApiErrorFields(text: string): {
  message: string | null;
  code: string | null;
} {
  try {
    const parsed = JSON.parse(text) as ApiErrorJson;
    const messageCandidate =
      typeof parsed.error === "string"
        ? parsed.error
        : typeof parsed.message === "string"
          ? parsed.message
          : null;
    const code = typeof parsed.code === "string" ? parsed.code : null;
    const message =
      messageCandidate && isDisplayablePlainText(messageCandidate)
        ? messageCandidate.trim()
        : null;
    return { message, code };
  } catch {
    return { message: null, code: null };
  }
}

export function resolveApiErrorMessage({
  status,
  bodyText,
  contentType,
  fallbacks = {
    unavailable: "The API is temporarily unavailable. Please try again.",
    serverError: "Something went wrong on the server. Please try again.",
    requestFailed: "Request failed. Please try again.",
  },
}: {
  status: number;
  bodyText: string;
  contentType?: string | null;
  fallbacks?: {
    unavailable: string;
    serverError: string;
    requestFailed: string;
  };
}): string {
  const trimmedBody = bodyText.trim();
  const { message: jsonMessage } = extractApiErrorFields(trimmedBody);
  if (jsonMessage) {
    return jsonMessage;
  }

  if (isDisplayablePlainText(trimmedBody)) {
    return trimmedBody;
  }

  if (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    contentType?.toLowerCase().includes("text/html") ||
    isHtmlLike(trimmedBody)
  ) {
    return fallbacks.unavailable;
  }

  if (status >= 500) {
    return fallbacks.serverError;
  }

  return fallbacks.requestFailed;
}
