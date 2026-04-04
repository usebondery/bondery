/**
 * LinkedIn Content Script Entry Point (WXT)
 *
 * Injects the "Add to Bondery" button on LinkedIn profiles.
 */
import { defineContentScript, type ContentScriptContext } from "#imports";
import { browser } from "wxt/browser";
import React from "react";
import { SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import LinkedInButton, {
  profileCache,
  extractProfilePhotoUrl,
} from "../../linkedin/LinkedInButton";
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

        // Immediately remove the stale button so it never flashes on the new
        // profile while we wait for the new profile's action buttons to render.
        const newUsername = getLinkedInUsername();
        if (currentUi && currentInjectedUsername !== newUsername) {
          currentUi.remove();
          currentUi = null;
          currentInjectedUsername = null;
        }

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
    });

    // Check if this tab was opened for auto-enrich
    checkForPendingEnrich();
  },
});

// ─── Profile Scraping ────────────────────────────────────────────────────────

async function getLinkedInSnapshot() {
  const username = getLinkedInUsername();
  if (!username) return null;

  // ── Use the button's warm cache whenever possible ─────────────────────────
  // LinkedInButton warms `profileCache` on mount using the same DOM + Voyager
  // pipeline the button click uses. If the cache is already warm, return the
  // rich data (Voyager work/edu, correct photo) directly rather than re-scraping.
  const cached = profileCache.get(username);
  if (cached) {
    return {
      platform: "linkedin" as const,
      handle: username,
      firstName: cached.firstName,
      middleName: cached.middleName,
      lastName: cached.lastName,
      profileImageUrl: cached.profilePhotoUrl,
      headline: cached.headline,
      location: cached.location,
      workHistory: cached.workHistory,
      educationHistory: cached.educationHistory,
      linkedinBio: cached.linkedinBio,
    };
  }

  // ── Fallback: basic DOM scrape (cache not warm yet) ───────────────────────
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

  // Language-agnostic photo extraction (shared module-level function)
  const profileImageUrl = extractProfilePhotoUrl() ?? undefined;

  // Fetch complete history via Voyager API (same pipeline the button uses).
  // Falls back to DOM scrape when API returns nothing (e.g. rate-limited or URN not found).
  const [fetchedWork, fetchedEdu] = await Promise.all([
    fetchFullWorkHistory(username),
    fetchFullEducation(username),
  ]);

  return {
    platform: "linkedin" as const,
    handle: username,
    firstName,
    middleName,
    lastName,
    profileImageUrl,
    headline,
    location,
    workHistory: fetchedWork.length > 0 ? fetchedWork : extractWorkExperience(),
    educationHistory: fetchedEdu.length > 0 ? fetchedEdu : extractEducation(),
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
let currentInjectedUsername: string | null = null;
let isInjecting = false;

/**
 * Returns a reference button from the LinkedIn profile action bar, using a
 * cascade of selectors from most-specific to most-generic to remain language-agnostic.
 *
 * LinkedIn's aria-labels are localised. Relying solely on `aria-label^='Message'`
 * breaks for non-English browser locales (e.g. macOS Chrome picks up the system
 * language). We therefore try several strategies in order:
 *   1. Data-control-name attribute (stable across locales)
 *   2. English aria-label (most users)
 *   3. artdeco-button class: LinkedIn's CTA action buttons (Follow, Message, Connect,
 *      More…) always carry the `artdeco-button` CSS class, while the inline company /
 *      school shortcut buttons in the top card do NOT. Filtering on this class ensures
 *      we skip those shortcut buttons and land on the real action row.
 */
function findProfileActionButton(): HTMLButtonElement | null {
  const profileSection = document.querySelector("section[data-member-id]") || document.body;

  // 1. data-control-name is NOT localised
  const byControlName = profileSection.querySelector<HTMLButtonElement>(
    'button[data-control-name="message"]',
  );
  if (byControlName) return byControlName;

  // 2. English aria-label (common case)
  const byEnglishLabel = profileSection.querySelector<HTMLButtonElement>(
    "button[aria-label^='Message']",
  );
  if (byEnglishLabel) return byEnglishLabel;

  // 3. Language-agnostic: find the first artdeco-button with visible text inside
  //    the top-card section. artdeco-button is LinkedIn's design-system class used
  //    exclusively on action CTAs — the quick-jump company/school buttons use a
  //    different class and are reliably excluded this way.
  //    Also exclude notification-edge-setting toggle buttons (class contains "nt-edge")
  //    which appear on connected profiles and also carry artdeco-button but live in
  //    a separate DOM branch from the real action row.
  const artdecoButtons = Array.from(
    profileSection.querySelectorAll<HTMLButtonElement>("button.artdeco-button"),
  ).filter((btn) => {
    // Stay inside the top-card — exclude buttons inside sub-sections (experience, etc.)
    const section = btn.closest("section");
    if (section && section !== profileSection) return false;
    // Exclude notification-edge-setting toggle buttons
    if (btn.closest("[class*='nt-edge']")) return false;
    return true;
  });

  const firstArtdeco = artdecoButtons.find((btn) => !!btn.textContent?.trim());
  if (firstArtdeco) return firstArtdeco;

  // 4. Ultimate fallback — any button with text in the profile section.
  //    Reached only if LinkedIn ever drops the artdeco-button class.
  const allButtons = Array.from(
    profileSection.querySelectorAll<HTMLButtonElement>("button"),
  ).filter((btn) => {
    const section = btn.closest("section");
    if (section && section !== profileSection) return false;
    if (btn.closest("[class*='nt-edge']")) return false;
    return true;
  });

  return allButtons.find((btn) => !!btn.textContent?.trim()) ?? null;
}

/**
 * Finds the LinkedIn action buttons container and returns it so the Bondery
 * button can be inserted immediately after it.
 */
function findLinkedInAnchor(): Element | null {
  const profileSection = document.querySelector("section[data-member-id]") || document.body;
  const referenceButton = findProfileActionButton();

  if (!referenceButton) {
    return null;
  }

  // Walk up from the reference button to find the shallowest div that contains
  // at least 2 artdeco-buttons (the action buttons row), stopping before the
  // profile section. Using artdeco-button ensures we don't accidentally match
  // container divs that hold the company/school shortcut buttons.
  // nt-edge notification-toggle buttons are excluded from the count so they
  // don't inflate the tally and cause us to stop at the wrong ancestor.
  let actionButtonsContainer: HTMLElement | null = referenceButton.closest("div");

  while (actionButtonsContainer && actionButtonsContainer !== profileSection) {
    const buttonCount = Array.from(
      actionButtonsContainer.querySelectorAll<HTMLButtonElement>("button.artdeco-button"),
    ).filter((b) => !b.closest("[class*='nt-edge']")).length;
    if (buttonCount >= 2) {
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

  // If button already exists for this exact username, nothing to do.
  // If it exists for a different username (SPA navigation), remove and re-inject.
  if (document.querySelector("bondery-linkedin")) {
    if (currentInjectedUsername === username) {
      return;
    }
    // Different profile — tear down the stale button before re-injecting.
    if (currentUi) {
      currentUi.remove();
      currentUi = null;
      currentInjectedUsername = null;
    }
  }

  // Remove previous shadow root UI if navigating between profiles
  if (currentUi) {
    currentUi.remove();
    currentUi = null;
    currentInjectedUsername = null;
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
    currentInjectedUsername = username;
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

    // LinkedIn's profile page is ready when the profile section has at least one
    // artdeco-button (the primary CTA). Using the artdeco-button class avoids a
    // false-positive on the company/school shortcut buttons that appear earlier
    // in the DOM and don't use that class.
    if (!document.querySelector("section[data-member-id] button.artdeco-button")) {
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
