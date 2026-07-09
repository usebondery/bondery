import { clearTokens, getAccessToken } from "../auth";

export class AuthRequiredError extends Error {
  readonly requiresAuth = true;

  constructor(message: string) {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class ExtensionOutdatedError extends Error {
  readonly extensionOutdated = true;

  constructor(message: string) {
    super(message);
    this.name = "ExtensionOutdatedError";
  }
}

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken();

  if (!token) {
    throw new AuthRequiredError("Not authenticated");
  }

  const extensionVersion = chrome.runtime.getManifest().version;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
    "X-Bondery-Extension-Version": extensionVersion,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    await clearTokens();
    throw new AuthRequiredError("Session expired");
  }

  if (response.status === 426) {
    await chrome.storage.local.set({ updateRequired: true });
    throw new ExtensionOutdatedError("Extension update required");
  }

  return response;
}
