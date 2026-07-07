/**
 * LinkedIn Content Script Entry Point (WXT)
 *
 * Injects the "Add to Bondery" button on LinkedIn profiles.
 */
import { defineContentScript, type ContentScriptContext } from "#imports";
import { browser } from "wxt/browser";
import { SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import LinkedInButton, { extractProfilePhotoUrl } from "../../linkedin/LinkedInButton";
import { renderInShadowRoot } from "../../shared/renderInShadowRoot";
import type { ShadowRootContentScriptUi } from "wxt/utils/content-script-ui/shadow-root";
import type ReactDOM from "react-dom/client";
import { getTopcard, extractProfileUrnFromComponentKey } from "../../linkedin/sduiProfile";
import { profileCache, scrapeLinkedInProfile } from "../../linkedin/scrapeProfile";

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

      if (message?.type === "RUN_PENDING_ENRICH") {
        const triggerRequestId = message.payload?.requestId as string | undefined;
        console.log("[linkedin][enrich] RUN_PENDING_ENRICH received", { triggerRequestId });
        runPendingEnrich(triggerRequestId)
          .then(() => sendResponse({ ok: true }))
          .catch((error) => sendResponse({ ok: false, error: String(error) }));
        return true;
      }
    });

    // Fallback if background push arrives before the listener is registered
    void runPendingEnrich();
  },
});

// ─── Profile Scraping ────────────────────────────────────────────────────────

async function getLinkedInSnapshot() {
  const username = getLinkedInUsername();
  if (!username) return null;

  const cached = profileCache.get(username);
  if (cached) {
    return {
      platform: "linkedin" as const,
      handle: username,
      firstName: cached.firstName,
      middleName: cached.middleName,
      lastName: cached.lastName,
      profileImageUrl: cached.profilePhotoUrl ?? extractProfilePhotoUrl() ?? undefined,
      headline: cached.headline,
      location: cached.location,
      workHistory: cached.workHistory,
      educationHistory: cached.educationHistory,
      linkedinBio: cached.linkedinBio,
    };
  }

  const profile = await scrapeLinkedInProfile(username);

  return {
    platform: "linkedin" as const,
    handle: username,
    firstName: profile.firstName,
    middleName: profile.middleName,
    lastName: profile.lastName,
    profileImageUrl: profile.profilePhotoUrl ?? extractProfilePhotoUrl() ?? undefined,
    headline: profile.headline,
    location: profile.location,
    workHistory: profile.workHistory,
    educationHistory: profile.educationHistory,
    linkedinBio: profile.linkedinBio,
  };
}

function getLinkedInUsername(): string | null {
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/in\/([^/]+)\/?$/);

  if (match?.[1]) {
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
function getProfileScope(): Element {
  return getTopcard() ?? document.body;
}

function findProfileActionButton(): HTMLButtonElement | null {
  const profileSection = getProfileScope();

  const byControlName = profileSection.querySelector<HTMLButtonElement>(
    'button[data-control-name="message"]',
  );
  if (byControlName) return byControlName;

  const byEnglishLabel = profileSection.querySelector<HTMLButtonElement>(
    "button[aria-label^='Message']",
  );
  if (byEnglishLabel) return byEnglishLabel;

  const artdecoButtons = Array.from(
    profileSection.querySelectorAll<HTMLButtonElement>("button.artdeco-button"),
  ).filter((btn) => {
    if (btn.closest("[class*='nt-edge']")) return false;
    return true;
  });

  const firstArtdeco = artdecoButtons.find((btn) => !!btn.textContent?.trim());
  if (firstArtdeco) return firstArtdeco;

  const allButtons = Array.from(profileSection.querySelectorAll<HTMLButtonElement>("button")).filter(
    (btn) => !btn.closest("[class*='nt-edge']"),
  );

  return allButtons.find((btn) => !!btn.textContent?.trim()) ?? null;
}

/**
 * Finds the LinkedIn action buttons container and returns it so the Bondery
 * button can be inserted immediately after it.
 */
function findLinkedInAnchor(): Element | null {
  const profileSection = getProfileScope();
  const referenceButton = findProfileActionButton();

  if (!referenceButton) {
    return null;
  }

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
    return referenceButton.parentElement;
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
    if (!getTopcard()?.querySelector("button.artdeco-button, button[data-control-name='message']")) {
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

interface EnrichContextPayload {
  contactId: string;
  linkedinHandle: string;
  requestId: string;
}

let enrichInFlightRequestId: string | null = null;

/**
 * Polls the background until this tab is registered as the enrich target.
 * When triggered by background (RUN_PENDING_ENRICH), polls up to 20s; otherwise one try only.
 */
async function waitForEnrichContext(triggerRequestId?: string): Promise<EnrichContextPayload | null> {
  const pollOnce = async (): Promise<EnrichContextPayload | null> => {
    const response = await browser.runtime.sendMessage({ type: "GET_ENRICH_CONTEXT" });
    if (response?.type === "ENRICH_CONTEXT_RESULT" && response.payload) {
      return response.payload as EnrichContextPayload;
    }
    return null;
  };

  const first = await pollOnce();
  if (first || !triggerRequestId) return first;

  const start = Date.now();
  while (Date.now() - start < 20_000) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const next = await pollOnce();
    if (next) return next;
  }
  return null;
}

/** Waits for SDUI topcard + Voyager URN — does not require action buttons (background tabs). */
function waitForEnrichScrapeReady(timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (getTopcard() && extractProfileUrnFromComponentKey()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/**
 * Runs enrich when this LinkedIn tab was opened by the background.
 * Callable from startup (poll) or when background sends RUN_PENDING_ENRICH.
 */
async function runPendingEnrich(triggerRequestId?: string): Promise<void> {
  if (triggerRequestId && enrichInFlightRequestId === triggerRequestId) {
    console.log("[linkedin][enrich] already in flight", triggerRequestId);
    return;
  }

  let requestId: string | undefined;

  try {
    const username = getLinkedInUsername();
    if (!username) {
      console.log("[linkedin][enrich] not a profile URL, skipping", window.location.href);
      return;
    }

    const context = await waitForEnrichContext(triggerRequestId);
    if (!context) {
      const msg = "Enrich context not found (extension may have reloaded)";
      console.warn("[linkedin][enrich]", msg);
      if (triggerRequestId) {
        await browser.runtime.sendMessage({
          type: "ENRICH_ERROR",
          payload: { requestId: triggerRequestId, error: msg },
        });
      }
      return;
    }

    if (triggerRequestId && context.requestId !== triggerRequestId) {
      console.warn("[linkedin][enrich] requestId mismatch", triggerRequestId, context.requestId);
      return;
    }

    const { contactId, linkedinHandle } = context;
    requestId = context.requestId;
    enrichInFlightRequestId = requestId;

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

    await waitForEnrichScrapeReady();

    const profile = await scrapeLinkedInProfile(username, { skipLazySectionScroll: true });
    const {
      firstName,
      middleName,
      lastName,
      profilePhotoUrl: profileImageUrl,
      headline,
      location,
      workHistory,
      educationHistory,
      linkedinBio,
    } = profile;

    console.log(
      `[linkedin][enrich] Scraped ${workHistory.length} work, ${educationHistory.length} edu for`,
      username,
    );

    await browser.runtime.sendMessage({
      type: "SUBMIT_ENRICH_DATA",
      payload: {
        requestId,
        contactId,
        profile: {
          platform: "linkedin" as const,
          handle: username,
          firstName,
          middleName,
          lastName,
          profileImageUrl: profileImageUrl ?? extractProfilePhotoUrl() ?? undefined,
          headline,
          location,
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
  } finally {
    if (requestId && enrichInFlightRequestId === requestId) {
      enrichInFlightRequestId = null;
    }
  }
}

/**
 * Waits for the LinkedIn profile page to be ready by watching for the Message button.
 *
 * @param timeoutMs Maximum time to wait in milliseconds.
 */
function isProfileReady(): boolean {
  const topcard = getTopcard();
  if (!topcard) return false;
  return !!findProfileActionButton();
}

function waitForProfileReady(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (isProfileReady()) {
      resolve();
      return;
    }

    const observer = new MutationObserver(() => {
      if (isProfileReady()) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve();
      }
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve();
    }, timeoutMs);

    observer.observe(document.body, { childList: true, subtree: true });
  });
}
