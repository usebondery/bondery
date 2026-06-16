export type ExtensionInstallState = "installed" | "not_installed";

export interface ExtensionDetectionResult {
  state: ExtensionInstallState;
  version: string | null;
}

const EXTENSION_PING_TYPE = "BONDERY_EXTENSION_PING";
const EXTENSION_PONG_TYPE = "BONDERY_EXTENSION_PONG";

/**
 * Detects whether the Bondery Chrome extension is installed and active
 * for the current page by performing a postMessage ping/pong handshake.
 *
 * @param timeoutMs Maximum time to wait for the extension response in milliseconds.
 * @returns A promise resolving to the detection result with install state and version.
 */
export function detectBonderyChromeExtension(timeoutMs = 1200): Promise<ExtensionDetectionResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({ state: "not_installed", version: null });
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
      resolve({
        state: "installed",
        version: typeof event.data.version === "string" ? event.data.version : null,
      });
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve({ state: "not_installed", version: null });
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
