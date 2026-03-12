export type ExtensionAuthState = "authenticated" | "not_authenticated" | "not_installed";

const AUTH_STATUS_REQUEST_TYPE = "BONDERY_AUTH_STATUS_REQUEST";
const AUTH_STATUS_RESPONSE_TYPE = "BONDERY_AUTH_STATUS_RESPONSE";

/**
 * Checks whether the Bondery Chrome Extension is installed and whether
 * the user is signed in. Combines the install-detection and auth check
 * into a single round-trip via the webapp bridge content script.
 *
 * @param timeoutMs Maximum time to wait for a response before assuming not installed.
 * @returns `"authenticated"` | `"not_authenticated"` | `"not_installed"`
 */
export function checkExtensionAuth(timeoutMs = 2000): Promise<ExtensionAuthState> {
  if (typeof window === "undefined") {
    return Promise.resolve("not_installed");
  }

  return new Promise((resolve) => {
    const requestId = crypto.randomUUID();

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timeoutId);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type !== AUTH_STATUS_RESPONSE_TYPE) return;
      if (event.data?.requestId !== requestId) return;

      cleanup();
      resolve(event.data.payload?.isAuthenticated ? "authenticated" : "not_authenticated");
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve("not_installed");
    }, timeoutMs);

    window.addEventListener("message", onMessage);

    window.postMessage(
      {
        type: AUTH_STATUS_REQUEST_TYPE,
        requestId,
      },
      window.location.origin,
    );
  });
}
