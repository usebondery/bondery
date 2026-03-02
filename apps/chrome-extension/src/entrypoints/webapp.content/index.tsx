/**
 * Webapp Bridge Content Script Entry Point (WXT)
 *
 * Allows the webapp to detect if the extension is installed
 * by responding to ping messages.
 */
import { defineContentScript } from "#imports";

export default defineContentScript({
  matches: ["https://app.usebondery.com/*"],
  runAt: "document_idle",

  main() {
    const EXTENSION_PING_TYPE = "BONDERY_EXTENSION_PING";
    const EXTENSION_PONG_TYPE = "BONDERY_EXTENSION_PONG";

    window.addEventListener("message", (event: MessageEvent) => {
      if (event.source !== window) {
        return;
      }

      if (event.data?.type !== EXTENSION_PING_TYPE) {
        return;
      }

      window.postMessage(
        {
          type: EXTENSION_PONG_TYPE,
          requestId: event.data.requestId,
          source: "bondery-extension",
        },
        "*",
      );
    });

    console.log("Bondery Extension: Webapp bridge initialized");
  },
});
