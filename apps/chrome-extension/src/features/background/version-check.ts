import { isVersionBelow } from "@bondery/helpers";
import { browser } from "wxt/browser";
import { config } from "../../config";
import { updateActionContextIndicator } from "./badge";

/**
 * Fetches the minimum required extension version from the API /status endpoint
 * and stores whether an update is required in browser.storage.local.
 */
export async function checkVersionCompatibility(): Promise<void> {
  try {
    const response = await fetch(`${config.apiUrl}/status`);
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    const minVersion = data?.extension?.minVersion;
    if (!minVersion) {
      return;
    }

    const currentVersion = browser.runtime.getManifest().version;
    const updateRequired = isVersionBelow(currentVersion, minVersion);

    await browser.storage.local.set({ updateRequired });
    await updateActionContextIndicator();
  } catch {
    // Network errors are non-fatal; keep the previous stored value.
  }
}
