import { browser } from "wxt/browser";
import { scrapeLinkedInProfile } from "../../features/linkedin/scrape/scrapeProfile";
import {
  extractProfileUrnFromComponentKey,
  getTopcard,
} from "../../features/linkedin/scrape/sduiProfile";
import { extractProfilePhotoUrl } from "../../features/linkedin/ui/LinkedInButton";
import { extLog } from "../../lib/log";
import { getLinkedInUsername } from "./username";

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
async function waitForEnrichContext(
  triggerRequestId?: string,
): Promise<EnrichContextPayload | null> {
  const pollOnce = async (): Promise<EnrichContextPayload | null> => {
    const response = await browser.runtime.sendMessage({ type: "GET_ENRICH_CONTEXT" });
    if (response?.type === "ENRICH_CONTEXT_RESULT" && response.payload) {
      return response.payload as EnrichContextPayload;
    }
    return null;
  };

  const first = await pollOnce();
  if (first || !triggerRequestId) {
    return first;
  }

  const start = Date.now();
  while (Date.now() - start < 20_000) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const next = await pollOnce();
    if (next) {
      return next;
    }
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
export async function runPendingEnrich(triggerRequestId?: string): Promise<void> {
  if (triggerRequestId && enrichInFlightRequestId === triggerRequestId) {
    extLog.debug("[linkedin][enrich] already in flight", triggerRequestId);
    return;
  }

  let requestId: string | undefined;

  try {
    const username = getLinkedInUsername();
    if (!username) {
      extLog.debug("[linkedin][enrich] not a profile URL, skipping", window.location.href);
      return;
    }

    const context = await waitForEnrichContext(triggerRequestId);
    if (!context) {
      const msg = "Enrich context not found (extension may have reloaded)";
      extLog.warn("[linkedin][enrich]", msg);
      if (triggerRequestId) {
        await browser.runtime.sendMessage({
          payload: { error: msg, requestId: triggerRequestId },
          type: "ENRICH_ERROR",
        });
      }
      return;
    }

    if (triggerRequestId && context.requestId !== triggerRequestId) {
      extLog.warn("[linkedin][enrich] requestId mismatch", triggerRequestId, context.requestId);
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
      extLog.warn("[linkedin][enrich] Handle mismatch:", username, "!=", normalizedHandle);
      await browser.runtime.sendMessage({
        payload: {
          error: `Profile mismatch: expected ${normalizedHandle}, got ${username}`,
          requestId,
        },
        type: "ENRICH_ERROR",
      });
      return;
    }

    extLog.debug("[linkedin][enrich] Auto-enrich triggered for", username);

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

    extLog.debug(
      `[linkedin][enrich] Scraped ${workHistory.length} work, ${educationHistory.length} edu for`,
      username,
    );

    await browser.runtime.sendMessage({
      payload: {
        contactId,
        profile: {
          educationHistory,
          firstName,
          handle: username,
          headline,
          lastName,
          linkedinBio,
          location,
          middleName,
          platform: "linkedin" as const,
          profileImageUrl: profileImageUrl ?? extractProfilePhotoUrl() ?? undefined,
          workHistory,
        },
        requestId,
      },
      type: "SUBMIT_ENRICH_DATA",
    });

    extLog.debug("[linkedin][enrich] Enrich data submitted for", username);
  } catch (error) {
    extLog.error("[linkedin][enrich] Auto-enrich failed:", error);
    // Report the error back to background so the webapp gets immediate feedback
    if (requestId) {
      try {
        await browser.runtime.sendMessage({
          payload: {
            error: error instanceof Error ? error.message : "Auto-enrich failed",
            requestId,
          },
          type: "ENRICH_ERROR",
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
