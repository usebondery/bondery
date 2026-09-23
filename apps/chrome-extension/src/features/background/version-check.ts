import { isVersionBelow } from "@bondery/helpers";
import { browser } from "wxt/browser";
import { config } from "../../config";
import { updateActionContextIndicator } from "./badge";

/**
 * Fetches the public extension manifest and stores a non-blocking update nudge
 * when the installed version is below `latestVersion` (current production CalVer).
 * HTTP 426 / `minVersion` remains the hard API floor.
 */
export async function checkVersionCompatibility(): Promise<void> {
  try {
    const response = await fetch(`${config.apiUrl}/extension/manifest`);
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    const latestVersion = data?.extension?.latestVersion ?? data?.extension?.minVersion;
    if (!latestVersion) {
      return;
    }

    const currentVersion = browser.runtime.getManifest().version;
    const updateRequired = isVersionBelow(currentVersion, latestVersion);

    await browser.storage.local.set({ updateRequired });
    await updateActionContextIndicator();
  } catch {
    // Network errors are non-fatal; keep the previous stored value.
  }
}
