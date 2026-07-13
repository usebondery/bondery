/**
 * Instagram Content Script Entry Point (WXT)
 *
 * Injects the "Add to Bondery" button on Instagram profiles.
 * Also injects the network interceptor script into the MAIN world.
 */

import { parseInstagramUsername, SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import type ReactDOM from "react-dom/client";
import { browser } from "wxt/browser";
import type { ShadowRootContentScriptUi } from "wxt/utils/content-script-ui/shadow-root";
import { type ContentScriptContext, defineContentScript, injectScript } from "#imports";
import {
  INSTAGRAM_NETWORK_MESSAGE_SOURCE,
  INSTAGRAM_NETWORK_MESSAGE_TYPE,
  type NetworkMetaPayload,
} from "../../features/instagram/intercept/networkInterceptor";
import InstagramButton from "../../features/instagram/ui/InstagramButton";
import { extLog } from "../../lib/log";
import { renderInShadowRoot } from "../../lib/ui";

export default defineContentScript({
  cssInjectionMode: "ui",

  async main(ctx) {
    // Safety check: only run on Instagram
    if (!window.location.hostname.includes(SOCIAL_PLATFORM_URL_DETAILS.instagram.domain)) {
      return;
    }

    extLog.debug("Bondery Extension: Initializing Instagram integration");

    // Inject the network interceptor script into MAIN world immediately
    // This needs to happen at document_start to intercept all network requests
    try {
      await injectScript("/instagram-interceptor.js", {
        keepInDom: true,
      });
      extLog.debug("Bondery Extension: Network interceptor injected");
    } catch (error) {
      extLog.error("Bondery Extension: Failed to inject network interceptor:", error);
    }

    // Install network response listener for intercepted data
    installInstagramNetworkResponseListener();

    // Wait for DOM to be ready before injecting UI
    if (document.readyState === "loading") {
      await new Promise<void>((resolve) => {
        document.addEventListener("DOMContentLoaded", () => resolve());
      });
    }

    // Initial injection attempt
    injectBonderyButton(ctx);

    // Setup observer for SPA navigation
    const _observer = setupObserver(ctx);

    // Retry injection after delay
    ctx.setTimeout(() => {
      injectBonderyButton(ctx);
    }, 2000);

    // Listen for URL changes (SPA navigation)
    let lastUrl = window.location.href;
    const _urlCheckInterval = ctx.setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        ctx.setTimeout(() => {
          injectBonderyButton(ctx);
        }, 1000);
      }
    }, 500);

    // Listen for profile scrape requests from background
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "GET_SCRAPED_PROFILE") {
        sendResponse(getInstagramSnapshot());
      }
    });
  },
  matches: ["https://www.instagram.com/*", "https://instagram.com/*"],
  runAt: "document_start",
});

// ─── Network Interceptor Communication ───────────────────────────────────────

let hasInstalledInstagramNetworkResponseListener = false;
let lastInterceptedProfileMeta: NetworkMetaPayload | null = null;

function getAddressPlace(meta: NetworkMetaPayload | null): string | undefined {
  if (!meta) {
    return undefined;
  }

  const addressParts = [meta.addressStreet, meta.cityName, meta.zip]
    .map((value) => value.trim())
    .filter(Boolean);

  if (addressParts.length === 0) {
    return undefined;
  }

  return addressParts.join(", ");
}

function installInstagramNetworkResponseListener() {
  if (hasInstalledInstagramNetworkResponseListener) {
    return;
  }

  hasInstalledInstagramNetworkResponseListener = true;

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data;
    if (
      !data ||
      data.type !== INSTAGRAM_NETWORK_MESSAGE_TYPE ||
      data.source !== INSTAGRAM_NETWORK_MESSAGE_SOURCE
    ) {
      return;
    }

    const payload = data.payload as Partial<NetworkMetaPayload> | undefined;
    if (!payload?.username) {
      return;
    }

    lastInterceptedProfileMeta = {
      addressStreet: payload.addressStreet || "",
      category: payload.category || "",
      cityName: payload.cityName || "",
      description: payload.description || "",
      displayName: payload.displayName || payload.username,
      photoUrl: payload.photoUrl || "",
      username: payload.username,
      zip: payload.zip || "",
    };

    extLog.debug(
      "[instagram][network-intercept] Parsed profile metadata",
      lastInterceptedProfileMeta,
    );
  });
}

// ─── Profile Scraping ────────────────────────────────────────────────────────

function getInstagramSnapshot() {
  const username = getInstagramUsername();
  if (!username) {
    return null;
  }

  const interceptedMeta =
    lastInterceptedProfileMeta?.username === username ? lastInterceptedProfileMeta : null;

  const nameElement = document.querySelector(
    ".x1lliihq.x1plvlek.xryxfnj.x1n2onr6.xyejjpt.x15dsfln.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xvs91rp.xo1l8bm.x5n08af.x10wh9bi.xpm28yp.x8viiok.x1o7cslx",
  );
  const displayName = interceptedMeta?.displayName || nameElement?.textContent?.trim() || username;
  const parsedName = parseInstagramUsername({
    displayName,
    username,
  });

  const img = document.querySelector(
    `img[alt="${username}'s profile picture"]`,
  ) as HTMLImageElement | null;

  return {
    displayName,
    firstName: parsedName.firstName,
    handle: username,
    headline: interceptedMeta?.category || undefined,
    lastName: parsedName.lastName || undefined,
    location: getAddressPlace(interceptedMeta),
    middleName: parsedName.middleName || undefined,
    notes: interceptedMeta?.description || undefined,
    platform: "instagram" as const,
    profileImageUrl: interceptedMeta?.photoUrl || img?.src || undefined,
  };
}

function getInstagramUsername(): string | null {
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/([^/]+)\/?$/);

  if (
    match?.[1] &&
    !["explore", "reels", "stories", "direct", "accounts", "settings"].includes(match[1])
  ) {
    return match[1];
  }

  return null;
}

// ─── Button Injection ────────────────────────────────────────────────────────

let currentUi: ShadowRootContentScriptUi<ReactDOM.Root> | null = null;
let isInjecting = false;

async function injectBonderyButton(ctx: ContentScriptContext) {
  if (isInjecting) {
    return;
  }

  const username = getInstagramUsername();

  if (!username) {
    return;
  }

  const targetSection = document.querySelector(".x14vqqas");

  if (!targetSection) {
    return;
  }

  // Check if button already exists
  if (targetSection.querySelector("bondery-instagram")) {
    return;
  }

  // Remove previous shadow root UI if navigating between profiles
  if (currentUi) {
    currentUi.remove();
    currentUi = null;
  }

  isInjecting = true;
  try {
    currentUi = await renderInShadowRoot(ctx, {
      anchor: targetSection,
      append: "last",
      name: "bondery-instagram",
      position: "inline",
      render: () => <InstagramButton getSnapshot={getInstagramSnapshot} username={username} />,
    });
    extLog.debug("Bondery Extension: Button injected successfully");
  } finally {
    isInjecting = false;
  }
}

function setupObserver(ctx: ContentScriptContext) {
  const observer = new MutationObserver(() => {
    if (!ctx.isValid) {
      observer.disconnect();
      return;
    }
    const username = getInstagramUsername();
    if (username && !document.querySelector("bondery-instagram")) {
      injectBonderyButton(ctx);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}
