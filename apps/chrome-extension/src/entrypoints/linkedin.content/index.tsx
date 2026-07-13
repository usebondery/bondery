/**
 * LinkedIn Content Script Entry Point (WXT)
 *
 * Injects the "Add to Bondery" button on LinkedIn profiles.
 */

import { SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import { browser } from "wxt/browser";
import { defineContentScript } from "#imports";
import { extLog } from "../../lib/log";
import { runPendingEnrich } from "./autoEnrich";
import { clearStaleButtonIfNeeded, injectBonderyButton, setupObserver } from "./buttonInjection";
import { getLinkedInSnapshot } from "./profileSnapshot";
import { getLinkedInUsername } from "./username";

export default defineContentScript({
  cssInjectionMode: "ui",

  async main(ctx) {
    extLog.debug("[linkedin][content] entrypoint main invoked", {
      host: window.location.hostname,
      href: window.location.href,
    });

    // Safety check: only run on LinkedIn
    if (!window.location.hostname.includes(SOCIAL_PLATFORM_URL_DETAILS.linkedin.domain)) {
      return;
    }

    extLog.debug("Bondery Extension: Initializing LinkedIn integration");

    if (document.readyState === "loading") {
      await new Promise<void>((resolve) => {
        document.addEventListener("DOMContentLoaded", () => resolve());
      });
    }

    // LinkedIn renders dynamically — wait 1.5 s before first injection attempt
    // so the profile action buttons are likely present in the DOM.
    ctx.setTimeout(() => {
      injectBonderyButton(ctx);
    }, 1500);

    // Setup observer for SPA navigation (debounced, only fires when Message button appears)
    setupObserver(ctx);

    // Retry button injection after 3 s in case the profile rendered slowly
    ctx.setTimeout(() => {
      injectBonderyButton(ctx);
    }, 3000);

    // Listen for URL changes (SPA navigation)
    let lastUrl = window.location.href;
    ctx.setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;

        // Immediately remove the stale button so it never flashes on the new
        // profile while we wait for the new profile's action buttons to render.
        clearStaleButtonIfNeeded(getLinkedInUsername());

        ctx.setTimeout(() => {
          injectBonderyButton(ctx);
        }, 1000);
      }
    }, 500);

    // Listen for profile scrape requests from background
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "GET_SCRAPED_PROFILE") {
        getLinkedInSnapshot().then(sendResponse);
        return true; // keep the message channel open for the async response
      }

      if (message?.type === "RUN_PENDING_ENRICH") {
        const triggerRequestId = message.payload?.requestId as string | undefined;
        extLog.debug("[linkedin][enrich] RUN_PENDING_ENRICH received", { triggerRequestId });
        runPendingEnrich(triggerRequestId)
          .then(() => sendResponse({ ok: true }))
          .catch((error) => sendResponse({ error: String(error), ok: false }));
        return true;
      }
    });

    // Fallback if background push arrives before the listener is registered
    void runPendingEnrich();
  },
  matches: ["https://www.linkedin.com/*", "https://linkedin.com/*", "https://*.linkedin.com/*"],
  runAt: "document_start",
});
