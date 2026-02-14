export type ExtensionInstallState = "installed" | "not_installed";

const EXTENSION_PING_TYPE = "BONDERY_EXTENSION_PING";
const EXTENSION_PONG_TYPE = "BONDERY_EXTENSION_PONG";

/**
 * Detects whether the Bondery Chrome extension is installed and active
 * for the current page by performing a postMessage ping/pong handshake.
 *
 * @param timeoutMs Maximum time to wait for the extension response in milliseconds.
 * @returns A promise resolving to "installed" when the extension responds, otherwise "not_installed".
 */
export function detectBonderyChromeExtension(timeoutMs = 1200): Promise<ExtensionInstallState> {
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
      if (event.source !== window) {
        return;
      }

      if (event.data?.type !== EXTENSION_PONG_TYPE) {
        return;
      }

      if (event.data?.requestId !== requestId) {
        return;
      }

      cleanup();
      resolve("installed");
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve("not_installed");
    }, timeoutMs);

    window.addEventListener("message", onMessage);

    window.postMessage(
      {
        type: EXTENSION_PING_TYPE,
        requestId,
      },
      "*",
    );
  });
}
