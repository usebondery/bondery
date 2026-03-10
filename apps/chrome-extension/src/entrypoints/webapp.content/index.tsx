/**
 * Webapp Bridge Content Script Entry Point (WXT)
 *
 * Allows the webapp to detect if the extension is installed
 * by responding to ping messages, and bridges enrich requests
 * from the webapp to the extension background service worker.
 */
import { defineContentScript } from "#imports";
import { browser } from "wxt/browser";

export default defineContentScript({
  // http://localhost/* covers all ports (3000, 3002, etc.) since
  // Chrome match patterns don't support explicit port numbers.
  matches: ["https://app.usebondery.com/*", "http://localhost/*"],
  runAt: "document_idle",

  main() {
    const EXTENSION_PING_TYPE = "BONDERY_EXTENSION_PING";
    const EXTENSION_PONG_TYPE = "BONDERY_EXTENSION_PONG";
    const ENRICH_REQUEST_TYPE = "BONDERY_ENRICH_REQUEST";
    const ENRICH_RESULT_TYPE = "BONDERY_ENRICH_RESULT";

    // Use the page’s own origin as the target for postMessage
    // instead of "*" to prevent cross-origin iframes from intercepting.
    const targetOrigin = window.location.origin;

    window.addEventListener("message", async (event: MessageEvent) => {
      if (event.source !== window) {
        return;
      }

      // Ping/pong for extension detection
      if (event.data?.type === EXTENSION_PING_TYPE) {
        window.postMessage(
          {
            type: EXTENSION_PONG_TYPE,
            requestId: event.data.requestId,
            source: "bondery-extension",
          },
          targetOrigin,
        );
        return;
      }

      // Enrich request: forward to background service worker
      if (event.data?.type === ENRICH_REQUEST_TYPE) {
        try {
          // Send to background — the immediate response is just an ack.
          // The real result arrives later via browser.runtime.onMessage push.
          await browser.runtime.sendMessage({
            type: "ENRICH_PERSON_REQUEST",
            payload: event.data.payload,
          });
        } catch (error) {
          window.postMessage(
            {
              type: ENRICH_RESULT_TYPE,
              payload: {
                requestId: event.data.payload?.requestId,
                success: false,
                error: error instanceof Error ? error.message : "Extension communication failed",
              },
            },
            targetOrigin,
          );
        }
        return;
      }
    });

    // Listen for pushed messages from the background (e.g. final enrich result)
    browser.runtime.onMessage.addListener((message) => {
      if (message?.type === "ENRICH_PERSON_RESULT") {
        window.postMessage(
          {
            type: ENRICH_RESULT_TYPE,
            payload: message.payload,
          },
          targetOrigin,
        );
      }
    });

    console.log("Bondery Extension: Webapp bridge initialized");
  },
});
