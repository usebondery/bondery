import { browser } from "wxt/browser";
import { extLog } from "../../lib/log";

const EXTENSION_PING_TYPE = "BONDERY_EXTENSION_PING";
const EXTENSION_PONG_TYPE = "BONDERY_EXTENSION_PONG";
const AUTH_STATUS_REQUEST_TYPE = "BONDERY_AUTH_STATUS_REQUEST";
const AUTH_STATUS_RESPONSE_TYPE = "BONDERY_AUTH_STATUS_RESPONSE";
const ENRICH_REQUEST_TYPE = "BONDERY_ENRICH_REQUEST";
const ENRICH_RESULT_TYPE = "BONDERY_ENRICH_RESULT";
const OPEN_EXTENSIONS_PAGE_TYPE = "BONDERY_OPEN_EXTENSIONS_PAGE";

/**
 * Bridges postMessage traffic between the Bondery webapp and the extension
 * background service worker.
 */
export function installWebappBridge(): void {
  const targetOrigin = window.location.origin;

  window.addEventListener("message", async (event: MessageEvent) => {
    if (event.source !== window) {
      return;
    }

    if (event.data?.type === EXTENSION_PING_TYPE) {
      window.postMessage(
        {
          requestId: event.data.requestId,
          source: "bondery-extension",
          type: EXTENSION_PONG_TYPE,
          version: browser.runtime.getManifest().version,
        },
        targetOrigin,
      );
      return;
    }

    if (event.data?.type === AUTH_STATUS_REQUEST_TYPE) {
      try {
        const response = await browser.runtime.sendMessage({
          type: "AUTH_STATUS_REQUEST",
        });
        window.postMessage(
          {
            payload: response?.payload ?? { isAuthenticated: false },
            requestId: event.data.requestId,
            type: AUTH_STATUS_RESPONSE_TYPE,
          },
          targetOrigin,
        );
      } catch {
        window.postMessage(
          {
            payload: { isAuthenticated: false },
            requestId: event.data.requestId,
            type: AUTH_STATUS_RESPONSE_TYPE,
          },
          targetOrigin,
        );
      }
      return;
    }

    if (event.data?.type === OPEN_EXTENSIONS_PAGE_TYPE) {
      const requestId: string | undefined = event.data?.requestId;
      try {
        await browser.runtime.sendMessage({ type: "OPEN_EXTENSIONS_PAGE" });
        window.postMessage({ requestId, type: "BONDERY_OPEN_EXTENSIONS_PAGE_ACK" }, targetOrigin);
      } catch {
        // Extension may not be reachable; webapp will fall back to Chrome Web Store
      }
      return;
    }

    if (event.data?.type === ENRICH_REQUEST_TYPE) {
      try {
        await browser.runtime.sendMessage({
          payload: event.data.payload,
          type: "ENRICH_PERSON_REQUEST",
        });
      } catch (error) {
        window.postMessage(
          {
            payload: {
              error: error instanceof Error ? error.message : "Extension communication failed",
              requestId: event.data.payload?.requestId,
              success: false,
            },
            type: ENRICH_RESULT_TYPE,
          },
          targetOrigin,
        );
      }
      return;
    }
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "ENRICH_PERSON_RESULT") {
      window.postMessage(
        {
          payload: message.payload,
          type: ENRICH_RESULT_TYPE,
        },
        targetOrigin,
      );
    }
  });

  extLog.debug("Bondery Extension: Webapp bridge initialized");
}
