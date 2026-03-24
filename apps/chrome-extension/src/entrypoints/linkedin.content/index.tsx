/**
 * LinkedIn Content Script Entry Point (WXT)
 *
 * Injects the "Add to Bondery" button on LinkedIn profiles.
 */
import { defineContentScript, type ContentScriptContext } from "#imports";
import { browser } from "wxt/browser";
import React from "react";
import { SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import LinkedInButton from "../../linkedin/LinkedInButton";
import { renderInShadowRoot } from "../../shared/renderInShadowRoot";
import type { ShadowRootContentScriptUi } from "wxt/utils/content-script-ui/shadow-root";
import type ReactDOM from "react-dom/client";
import { extractWorkExperience, type WorkEntry } from "../../linkedin/workExperience";
import { extractEducation } from "../../linkedin/education";
import { fetchFullWorkHistory, fetchFullEducation } from "../../linkedin/fetchDetails";
// sanitizeName temporarily disabled – transliteration causes non-UTF-8 bytes in the bundle
const sanitizeName = (s: string) => s.trim();

export default defineContentScript({
  matches: ["https://www.linkedin.com/*", "https://linkedin.com/*", "https://*.linkedin.com/*"],
  runAt: "document_start",
  cssInjectionMode: "ui",

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
        ctx.setTimeout(() => {
          injectBonderyButton(ctx);
        }, 1000);
      }
    }, 500);

    // Listen for profile scrape requests from background
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "GET_SCRAPED_PROFILE") {
        sendResponse(getLinkedInSnapshot());
      }
    });

    // Check if this tab was opened for auto-enrich
    checkForPendingEnrich();
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
  const location = placeElement?.textContent?.trim() || undefined;

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
    location,
    workHistory: extractWorkExperience(),
  };
}

function getLinkedInUsername(): string | null {
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/in\/([^\/]+)\/?$/);

  if (match && match[1]) {
    // Decode percent-encoded handles (e.g. "ad%C3%A9la" → "adéla")
    // so we always work with the human-readable form.
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  return null;
}

// ─── Button Injection ────────────────────────────────────────────────────────

let currentUi: ShadowRootContentScriptUi<ReactDOM.Root> | null = null;
let isInjecting = false;

/**
 * Finds the LinkedIn action buttons container (the div that holds "Message" and
 * "More actions" buttons) and returns the parent element where the Bondery
 * button should be inserted.
 */
function findLinkedInAnchor(): Element | null {
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

  return actionButtonsContainer;
}

async function injectBonderyButton(ctx: ContentScriptContext) {
  if (isInjecting) return;

  const username = getLinkedInUsername();

  console.log("Bondery LinkedIn: Attempting to inject button", { username });

  if (!username) {
    console.log("Bondery LinkedIn: No username found in URL");
    return;
  }

  const anchor = findLinkedInAnchor();

  console.log("Bondery LinkedIn: Target section found:", !!anchor, anchor);

  if (!anchor) {
    console.log("Bondery LinkedIn: Target section not found.");
    return;
  }

  // Check if button already exists
  if (document.querySelector("bondery-linkedin")) {
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
      name: "bondery-linkedin",
      position: "inline",
      anchor,
      append: "after",
      render: () => <LinkedInButton username={username} />,
    });
    console.log("Bondery Extension: Button injected successfully on LinkedIn");
  } finally {
    isInjecting = false;
  }
}

function setupObserver(ctx: ContentScriptContext) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver(() => {
    if (!ctx.isValid) {
      observer.disconnect();
      return;
    }

    // LinkedIn's profile page is ready when the Message button is present.
    // Skip mutation bursts that happen before the profile section is rendered.
    if (!document.querySelector("button[aria-label^='Message']")) {
      return;
    }

    // Debounce: wait for DOM mutations to settle before trying to inject
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const username = getLinkedInUsername();
      if (username && !document.querySelector("bondery-linkedin")) {
        injectBonderyButton(ctx);
      }
    }, 300);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

// ─── Auto-Enrich ─────────────────────────────────────────────────────────────

/**
 * Checks whether this LinkedIn tab was opened by the background for an enrich request.
 * If so, waits for the page to render, performs a full scrape, and submits the data
 * back to the background service worker.
 */
async function checkForPendingEnrich(): Promise<void> {
  let requestId: string | undefined;

  try {
    const username = getLinkedInUsername();
    if (!username) return; // Not a profile page — no enrich context to report to

    // Ask the background if there's a pending enrich for this tab
    const response = await browser.runtime.sendMessage({
      type: "GET_ENRICH_CONTEXT",
    });

    if (!response || response.type !== "ENRICH_CONTEXT_RESULT" || !response.payload) {
      return; // No pending enrich for this tab — nothing to do
    }

    const { contactId, linkedinHandle } = response.payload;
    requestId = response.payload.requestId;

    // Verify this is the right profile — normalize both sides to decoded form
    const normalizedHandle = (() => {
      try {
        return decodeURIComponent(linkedinHandle);
      } catch {
        return linkedinHandle;
      }
    })();

    if (username.toLowerCase() !== normalizedHandle.toLowerCase()) {
      console.warn("[linkedin][enrich] Handle mismatch:", username, "!=", normalizedHandle);
      await browser.runtime.sendMessage({
        type: "ENRICH_ERROR",
        payload: {
          requestId,
          error: `Profile mismatch: expected ${normalizedHandle}, got ${username}`,
        },
      });
      return;
    }

    console.log("[linkedin][enrich] Auto-enrich triggered for", username);

    // Wait for the profile to render (Message button is a good indicator)
    await waitForProfileReady(10_000);

    // Scrape DOM first for immediate data
    const domWork = extractWorkExperience();
    const domLogosByCompany = new Map<string, string>();
    for (const dw of domWork) {
      if (dw.companyLogoUrl && dw.companyName) {
        domLogosByCompany.set(dw.companyName.toLowerCase(), dw.companyLogoUrl);
      }
    }

    // Fetch full work/education history via Voyager API
    const [fetchedWork, fetchedEdu] = await Promise.all([
      fetchFullWorkHistory(username, domLogosByCompany),
      fetchFullEducation(username),
    ]);

    const workHistory = fetchedWork.length > 0 ? fetchedWork : domWork;
    const educationHistory = fetchedEdu.length > 0 ? fetchedEdu : extractEducation();

    // Scrape remaining profile fields from DOM
    const snapshot = getLinkedInSnapshot();
    if (!snapshot) {
      await browser.runtime.sendMessage({
        type: "ENRICH_ERROR",
        payload: { requestId, error: "Failed to scrape LinkedIn profile (DOM snapshot empty)" },
      });
      return;
    }

    // Extract bio text
    const linkedinBio = extractBioText();

    console.log(
      `[linkedin][enrich] Scraped ${workHistory.length} work, ${educationHistory.length} edu for`,
      username,
    );

    // Submit enriched data back to background
    await browser.runtime.sendMessage({
      type: "SUBMIT_ENRICH_DATA",
      payload: {
        requestId,
        contactId,
        profile: {
          platform: "linkedin" as const,
          handle: username,
          firstName: snapshot.firstName,
          middleName: snapshot.middleName,
          lastName: snapshot.lastName,
          profileImageUrl: snapshot.profileImageUrl,
          headline: snapshot.headline,
          location: snapshot.location,
          workHistory,
          educationHistory,
          linkedinBio,
        },
      },
    });

    console.log("[linkedin][enrich] Enrich data submitted for", username);
  } catch (error) {
    console.error("[linkedin][enrich] Auto-enrich failed:", error);
    // Report the error back to background so the webapp gets immediate feedback
    if (requestId) {
      try {
        await browser.runtime.sendMessage({
          type: "ENRICH_ERROR",
          payload: {
            requestId,
            error: error instanceof Error ? error.message : "Auto-enrich failed",
          },
        });
      } catch {
        /* background may be unreachable */
      }
    }
  }
}

/**
 * Waits for the LinkedIn profile page to be ready by watching for the Message button.
 *
 * @param timeoutMs Maximum time to wait in milliseconds.
 */
function waitForProfileReady(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector("button[aria-label^='Message']")) {
      resolve();
      return;
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector("button[aria-label^='Message']")) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve();
      }
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve(); // Resolve anyway — scrape what we can
    }, timeoutMs);

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

/**
 * Extracts the "About" / bio text from the LinkedIn profile page.
 */
function extractBioText(): string | undefined {
  const heading = document.getElementById("about");
  if (!heading) return undefined;
  const section = heading.closest("section");
  if (!section) return undefined;
  const textSpans = Array.from(
    section.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'),
  ).filter((el) => el.closest("a") === null && (el.textContent?.trim().length ?? 0) > 20);
  if (textSpans.length === 0) return undefined;
  const bioSpan = textSpans.reduce((a, b) =>
    (a.textContent?.length ?? 0) >= (b.textContent?.length ?? 0) ? a : b,
  );
  const clone = bioSpan.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return clone.textContent?.trim() || undefined;
}
