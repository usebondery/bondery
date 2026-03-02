/**
 * Instagram Content Script Entry Point (WXT)
 *
 * Injects the "Add to Bondery" button on Instagram profiles.
 * Also injects the network interceptor script into the MAIN world.
 */
import { defineContentScript, injectScript } from "#imports";
import { browser } from "wxt/browser";
import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { parseInstagramUsername, SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import InstagramButton from "../../instagram/InstagramButton";
import { MantineWrapper } from "../../shared/MantineWrapper";

export default defineContentScript({
  matches: ["https://www.instagram.com/*", "https://instagram.com/*"],
  runAt: "document_start",

  async main(ctx) {
    // Safety check: only run on Instagram
    if (!window.location.hostname.includes(SOCIAL_PLATFORM_URL_DETAILS.instagram.domain)) {
      return;
    }

    console.log("Bondery Extension: Initializing Instagram integration");

    // Inject the network interceptor script into MAIN world immediately
    // This needs to happen at document_start to intercept all network requests
    try {
      await injectScript("/instagram-interceptor.js", {
        keepInDom: true,
      });
      console.log("Bondery Extension: Network interceptor injected");
    } catch (error) {
      console.error("Bondery Extension: Failed to inject network interceptor:", error);
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
    injectBonderyButton();

    // Setup observer for SPA navigation
    const observer = setupObserver(ctx);

    // Retry injection after delay
    ctx.setTimeout(() => {
      injectBonderyButton();
    }, 2000);

    // Listen for URL changes (SPA navigation)
    let lastUrl = window.location.href;
    const urlCheckInterval = ctx.setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        ctx.setTimeout(() => {
          injectBonderyButton();
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
});

// ─── Network Interceptor Communication ───────────────────────────────────────

interface InstagramNetworkProfileMeta {
  username: string;
  displayName: string;
  description: string;
  category: string;
  photoUrl: string;
  addressStreet: string;
  cityName: string;
  zip: string;
}

const INSTAGRAM_NETWORK_MESSAGE_TYPE = "BONDERY_IG_NETWORK_META";
const INSTAGRAM_NETWORK_MESSAGE_SOURCE = "bondery-instagram-network-interceptor";

let hasInstalledInstagramNetworkResponseListener = false;
let lastInterceptedProfileMeta: InstagramNetworkProfileMeta | null = null;

function getAddressPlace(meta: InstagramNetworkProfileMeta | null): string | undefined {
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

    const payload = data.payload as Partial<InstagramNetworkProfileMeta> | undefined;
    if (!payload?.username) {
      return;
    }

    lastInterceptedProfileMeta = {
      username: payload.username,
      displayName: payload.displayName || payload.username,
      description: payload.description || "",
      category: payload.category || "",
      photoUrl: payload.photoUrl || "",
      addressStreet: payload.addressStreet || "",
      cityName: payload.cityName || "",
      zip: payload.zip || "",
    };

    console.log(
      "[instagram][network-intercept] Parsed profile metadata",
      lastInterceptedProfileMeta,
    );
  });
}

// ─── Profile Scraping ────────────────────────────────────────────────────────

function getInstagramSnapshot() {
  const username = getInstagramUsername();
  if (!username) return null;

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
    platform: "instagram" as const,
    handle: username,
    displayName,
    firstName: parsedName.firstName,
    middleName: parsedName.middleName || undefined,
    lastName: parsedName.lastName || undefined,
    profileImageUrl: interceptedMeta?.photoUrl || img?.src || undefined,
    headline: interceptedMeta?.category || undefined,
    place: getAddressPlace(interceptedMeta),
    notes: interceptedMeta?.description || undefined,
  };
}

function getInstagramUsername(): string | null {
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/([^\/]+)\/?$/);

  if (
    match &&
    match[1] &&
    !["explore", "reels", "stories", "direct", "accounts", "settings"].includes(match[1])
  ) {
    return match[1];
  }

  return null;
}

// ─── Button Injection ────────────────────────────────────────────────────────

function injectBonderyButton() {
  const username = getInstagramUsername();

  if (!username) {
    return;
  }

  const targetSection = document.querySelector(".x14vqqas");

  if (!targetSection) {
    return;
  }

  // Check if button already exists
  if (document.querySelector("#bondery-ig-button-root")) {
    return;
  }

  // Create container for React component
  const container = document.createElement("div");
  container.id = "bondery-ig-button-root";
  targetSection.appendChild(container);

  // Render React component
  const root = ReactDOM.createRoot(container);
  root.render(
    <StrictMode>
      <MantineWrapper>
        <InstagramButton username={username} getSnapshot={getInstagramSnapshot} />
      </MantineWrapper>
    </StrictMode>,
  );

  console.log("Bondery Extension: Button injected successfully");
}

function setupObserver(ctx: { isValid: boolean }) {
  const observer = new MutationObserver(() => {
    if (!ctx.isValid) {
      observer.disconnect();
      return;
    }
    const username = getInstagramUsername();
    if (username && !document.querySelector("#bondery-ig-button-root")) {
      injectBonderyButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}
