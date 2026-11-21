import { clearTokens, getAccessToken } from "../auth";
import { AuthRequiredError } from "./auth-required-error";
import { ExtensionOutdatedError } from "./extension-outdated-error";

export { AuthRequiredError } from "./auth-required-error";
export { ExtensionOutdatedError } from "./extension-outdated-error";

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
