import { detectBonderyChromeExtension } from "./detectBonderyChromeExtension";

export type ExtensionAuthState = "authenticated" | "not_authenticated" | "not_installed";

const AUTH_STATUS_REQUEST_TYPE = "BONDERY_AUTH_STATUS_REQUEST";
const AUTH_STATUS_RESPONSE_TYPE = "BONDERY_AUTH_STATUS_RESPONSE";

function requestExtensionAuth(
  timeoutMs: number,
): Promise<Exclude<ExtensionAuthState, "not_installed">> {
  return new Promise((resolve) => {
    const requestId = crypto.randomUUID();

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timeoutId);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) {
        return;
      }
      if (event.data?.type !== AUTH_STATUS_RESPONSE_TYPE) {
        return;
      }
      if (event.data?.requestId !== requestId) {
        return;
      }

      cleanup();
      resolve(event.data.payload?.isAuthenticated ? "authenticated" : "not_authenticated");
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      // Ping already proved the content script is present.
      resolve("not_authenticated");
    }, timeoutMs);

    window.addEventListener("message", onMessage);

    window.postMessage(
      {
        requestId,
        type: AUTH_STATUS_REQUEST_TYPE,
      },
      window.location.origin,
    );
  });
}

/**
 * Checks whether the Bondery Chrome Extension is installed and whether
 * the user is signed in. Ping (content script only) first so a sleeping
 * service worker is not reported as "not installed".
 *
 * @param timeoutMs Maximum time to wait for the auth response after ping.
 * @returns `"authenticated"` | `"not_authenticated"` | `"not_installed"`
 */
export async function checkExtensionAuth(timeoutMs = 8000): Promise<ExtensionAuthState> {
  if (typeof window === "undefined") {
    return "not_installed";
  }

  const detection = await detectBonderyChromeExtension(1200);
  if (detection.state !== "installed") {
    return "not_installed";
  }

  return requestExtensionAuth(timeoutMs);
}
