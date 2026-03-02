/**
 * LinkedIn Content Script Entry Point (WXT)
 *
 * Injects the "Add to Bondery" button on LinkedIn profiles.
 */
import { defineContentScript, injectScript } from "#imports";
import { browser } from "wxt/browser";
import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import LinkedInButton from "../../linkedin/LinkedInButton";
import { MantineWrapper } from "../../shared/MantineWrapper";
// sanitizeName temporarily disabled – transliteration causes non-UTF-8 bytes in the bundle
const sanitizeName = (s: string) => s.trim();

const LINKEDIN_INTERCEPT_STATUS_TYPE = "BONDERY_LINKEDIN_INTERCEPT_STATUS";
const LINKEDIN_INTERCEPT_PROFILE_TYPE = "BONDERY_LINKEDIN_INTERCEPT_PROFILE";

export default defineContentScript({
  matches: ["https://www.linkedin.com/*", "https://linkedin.com/*", "https://*.linkedin.com/*"],
  runAt: "document_start",

  async main(ctx) {
    console.log("[linkedin][content] entrypoint main invoked", {
      href: window.location.href,
      host: window.location.hostname,
    });

    // Safety check: only run on LinkedIn
    if (!window.location.hostname.includes(SOCIAL_PLATFORM_URL_DETAILS.linkedin.domain)) {
      return;
    }

    console.log("Bondery Extension: Initializing LinkedIn integration");

    try {
      await injectScript("/linkedin-interceptor.js", {
        keepInDom: true,
      });
      console.log("Bondery Extension: LinkedIn HTML interceptor injected");
    } catch (error) {
      console.error("Bondery Extension: Failed to inject LinkedIn interceptor:", error);
    }

    window.addEventListener("message", (event: MessageEvent) => {
      if (event.source !== window) {
        return;
      }

      const data = event.data as
        | { type?: string; source?: string; status?: string; details?: unknown; payload?: unknown }
        | undefined;

      if (!data || data.source !== "bondery-linkedin-network-interceptor") {
        return;
      }

      if (data.type === LINKEDIN_INTERCEPT_STATUS_TYPE) {
        console.log("[linkedin][interceptor-status]", data.status, data.details || "");
      }

      if (data.type === LINKEDIN_INTERCEPT_PROFILE_TYPE) {
        console.log("[linkedin][interceptor-profile]", data.payload);
      }
    });

    if (document.readyState === "loading") {
      await new Promise<void>((resolve) => {
        document.addEventListener("DOMContentLoaded", () => resolve());
      });
    }

    // Initial injection attempt
    injectBonderyButton();

    // Setup observer for SPA navigation
    setupObserver(ctx);

    // Retry injection after delay
    ctx.setTimeout(() => {
      injectBonderyButton();
    }, 2000);

    // Listen for URL changes (SPA navigation)
    let lastUrl = window.location.href;
    ctx.setInterval(() => {
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
        sendResponse(getLinkedInSnapshot());
      }
    });
  },
});

// ─── Profile Scraping ────────────────────────────────────────────────────────

function getLinkedInSnapshot() {
  const username = getLinkedInUsername();
  if (!username) return null;

  const topCard = document.querySelector("section[data-member-id]") || document;
  const nameElement = topCard.querySelector("a[aria-label] > h1") || topCard.querySelector("h1");

  const alternativeNameSelectors = [
    "h1.text-heading-xlarge",
    ".pv-text-details__left-panel h1",
    "[data-anonymize='person-name']",
  ];

  const alternativeNameElement = alternativeNameSelectors
    .map((selector) => document.querySelector(selector))
    .find((element) => Boolean(element?.textContent?.trim()));

  const fullName =
    sanitizeName(
      nameElement?.textContent?.trim() || alternativeNameElement?.textContent?.trim() || "",
    ) || username;
  const nameParts = fullName.split(/\s+/).filter(Boolean);

  const firstName = nameParts[0] ?? username;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;
  const middleName =
    nameParts.length > 2 ? nameParts.slice(1, nameParts.length - 1).join(" ") : undefined;

  const titleElement = topCard.querySelector("div[data-generated-suggestion-target]");
  const headline = titleElement?.textContent?.trim() || undefined;

  const contactInfoLink = topCard.querySelector("#top-card-text-details-contact-info");
  const placeElement = contactInfoLink?.parentElement?.previousElementSibling || null;
  const place = placeElement?.textContent?.trim() || undefined;

  const profilePhotoImg = topCard.querySelector(
    "button[aria-label*='profile picture'] img",
  ) as HTMLImageElement | null;

  const memberPhotoContainer = document.querySelector(
    '[data-view-name="profile-top-card-member-photo"]',
  );
  const memberPhotoImg = memberPhotoContainer?.querySelector(
    'img[data-loaded="true"]',
  ) as HTMLImageElement | null;

  const fallbackPhotoSelectors = [
    ".pv-top-card-profile-picture__image",
    "[data-anonymize='headshot-photo']",
    "img.profile-photo-edit__preview",
    "img._021a4e24.a4f8c248.ad272af2._8d269092._00859a34",
  ];

  const fallbackPhotoImg = fallbackPhotoSelectors
    .map((selector) => document.querySelector(selector) as HTMLImageElement | null)
    .find((image) => Boolean(image?.src && !image.src.includes("data:image")));

  const profileImageUrl =
    (profilePhotoImg?.src && !profilePhotoImg.src.includes("data:image") && profilePhotoImg.src) ||
    (memberPhotoImg?.src && !memberPhotoImg.src.includes("data:image") && memberPhotoImg.src) ||
    fallbackPhotoImg?.src ||
    undefined;

  return {
    platform: "linkedin" as const,
    handle: username,
    firstName,
    middleName,
    lastName,
    profileImageUrl,
    headline,
    place,
  };
}

function getLinkedInUsername(): string | null {
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/in\/([^\/]+)\/?$/);

  if (match && match[1]) {
    return match[1];
  }

  return null;
}

// ─── Button Injection ────────────────────────────────────────────────────────

function injectBonderyButton() {
  const username = getLinkedInUsername();

  console.log("Bondery LinkedIn: Attempting to inject button", { username });

  if (!username) {
    console.log("Bondery LinkedIn: No username found in URL");
    return;
  }

  const targetSection = (() => {
    const profileSection = document.querySelector("section[data-member-id]") || document.body;
    const messageButton = profileSection.querySelector("button[aria-label^='Message']");

    if (!messageButton) {
      return null;
    }

    let actionButtonsContainer: HTMLElement | null = messageButton.closest("div");

    while (actionButtonsContainer && actionButtonsContainer !== profileSection) {
      const hasMessage = !!actionButtonsContainer.querySelector("button[aria-label^='Message']");
      const hasMoreActions = !!actionButtonsContainer.querySelector(
        "button[aria-label='More actions']",
      );

      if (hasMessage && hasMoreActions) {
        break;
      }

      actionButtonsContainer = actionButtonsContainer.parentElement;
    }

    if (!actionButtonsContainer || actionButtonsContainer === profileSection) {
      return null;
    }

    const insertParent = actionButtonsContainer.parentElement;

    if (!insertParent) {
      return null;
    }

    const existing = insertParent.querySelector("#bondery-li-button-root");
    if (existing) {
      return existing;
    }

    const container = document.createElement("div");
    container.id = "bondery-li-button-root";
    container.style.display = "flex";
    container.style.flexDirection = "column";

    insertParent.insertBefore(container, actionButtonsContainer.nextSibling);
    return container;
  })();

  console.log("Bondery LinkedIn: Target section found:", !!targetSection, targetSection);

  if (!targetSection) {
    console.log("Bondery LinkedIn: Target section not found.");
    return;
  }

  // Render React component
  const root = ReactDOM.createRoot(targetSection);
  root.render(
    <StrictMode>
      <MantineWrapper>
        <LinkedInButton username={username} />
      </MantineWrapper>
    </StrictMode>,
  );

  console.log("Bondery Extension: Button injected successfully on LinkedIn");
}

function setupObserver(ctx: { isValid: boolean }) {
  const observer = new MutationObserver(() => {
    if (!ctx.isValid) {
      observer.disconnect();
      return;
    }
    const username = getLinkedInUsername();
    if (username && !document.querySelector("#bondery-li-button-root")) {
      injectBonderyButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}
