import { ApiError } from "./ApiError";
import { extractApiErrorFields, resolveApiErrorMessage } from "./parseApiError";

export async function parseApiJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    const { code } = extractApiErrorFields(text);
    throw new ApiError(
      resolveApiErrorMessage({
        status: response.status,
        bodyText: text,
        contentType: response.headers.get("Content-Type"),
      }),
      response.status,
      code,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function parseApiJsonResponseOrNull<T>(response: Response): Promise<T | null> {
  if (!response.ok) {
    return null;
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
