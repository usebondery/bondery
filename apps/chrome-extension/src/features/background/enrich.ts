import { browser } from "wxt/browser";
import { enrichPersonFromLinkedIn } from "../../lib/api/domains/contacts";
import { isAuthenticated } from "../../lib/auth";
import { extLog } from "../../lib/log";
import type { EnrichError, EnrichPersonRequest, SubmitEnrichData } from "../../lib/messaging/types";
import { backgroundState } from "./state";

const ENRICH_TIMEOUT_MINUTES = 1.5;
const ENRICH_KEEPALIVE_MINUTES = 0.4;
const PENDING_ENRICH_SESSION_KEY = "pendingEnrich";

const enrichTabListeners = new Map<
  number,
  (tabId: number, changeInfo: { status?: string }) => void
>();

async function persistPendingEnrich(): Promise<void> {
  try {
    if (backgroundState.pendingEnrich) {
      await browser.storage.session.set({
        [PENDING_ENRICH_SESSION_KEY]: backgroundState.pendingEnrich,
      });
    } else {
      await browser.storage.session.remove(PENDING_ENRICH_SESSION_KEY);
    }
  } catch {
    /* session storage may be unavailable */
  }
}

function removeEnrichTabListener(tabId: number): void {
  const listener = enrichTabListeners.get(tabId);
  if (!listener) {
    return;
  }
  browser.tabs.onUpdated.removeListener(listener);
  enrichTabListeners.delete(tabId);
}

function scheduleEnrichTriggerOnTab(tabId: number, requestId: string): void {
  removeEnrichTabListener(tabId);

  const tryTrigger = async (source: string) => {
    if (
      !backgroundState.pendingEnrich ||
      backgroundState.pendingEnrich.requestId !== requestId ||
      backgroundState.pendingEnrich.linkedinTabId !== tabId
    ) {
      return;
    }

    try {
      await browser.tabs.sendMessage(tabId, {
        payload: { requestId },
        type: "RUN_PENDING_ENRICH",
      });
      extLog.debug("[background][enrich] RUN_PENDING_ENRICH delivered", {
        requestId,
        source,
        tabId,
      });
    } catch {
      extLog.debug("[background][enrich] RUN_PENDING_ENRICH not ready yet", {
        requestId,
        source,
        tabId,
      });
    }
  };

  const onUpdated = (updatedTabId: number, changeInfo: { status?: string }) => {
    if (updatedTabId !== tabId || changeInfo.status !== "complete") {
      return;
    }
    void tryTrigger("tab-complete");
  };

  browser.tabs.onUpdated.addListener(onUpdated);
  enrichTabListeners.set(tabId, onUpdated);

  void tryTrigger("immediate");
  for (const delay of [400, 1000, 2000, 4000, 7000, 12000]) {
    setTimeout(() => void tryTrigger(`retry-${delay}ms`), delay);
  }
}

export async function restorePendingEnrichIfAny(): Promise<void> {
  try {
    const stored = await browser.storage.session.get(PENDING_ENRICH_SESSION_KEY);
    const value = stored[PENDING_ENRICH_SESSION_KEY] as typeof backgroundState.pendingEnrich;
    if (!value?.requestId || !value.linkedinTabId || value.linkedinTabId < 1) {
      return;
    }

    backgroundState.pendingEnrich = value;
    extLog.debug("[background][enrich] restored pending enrich from session", {
      linkedinTabId: value.linkedinTabId,
      requestId: value.requestId,
    });

    scheduleEnrichTriggerOnTab(value.linkedinTabId, value.requestId);
    await browser.alarms.create("enrich-timeout", { delayInMinutes: ENRICH_TIMEOUT_MINUTES });
    await browser.alarms.create("enrich-keepalive", { periodInMinutes: ENRICH_KEEPALIVE_MINUTES });
  } catch (error) {
    extLog.warn("[background][enrich] session restore failed", error);
  }
}

export async function clearPendingEnrich(reason?: string): Promise<void> {
  if (!backgroundState.pendingEnrich) {
    return;
  }

  const { senderTabId, linkedinTabId, requestId } = backgroundState.pendingEnrich;
  backgroundState.pendingEnrich = null;
  removeEnrichTabListener(linkedinTabId);
  void persistPendingEnrich();

  try {
    await browser.alarms.clear("enrich-timeout");
  } catch {
    /* ok */
  }
  try {
    await browser.alarms.clear("enrich-keepalive");
  } catch {
    /* ok */
  }

  if (reason) {
    extLog.warn("[background][enrich] clearing pending enrich:", reason, { requestId });

    try {
      await browser.tabs.remove(linkedinTabId);
    } catch {
      /* tab may already be closed */
    }

    try {
      await browser.tabs.sendMessage(senderTabId, {
        payload: { error: reason, requestId, success: false },
        type: "ENRICH_PERSON_RESULT",
      });
    } catch {
      /* sender tab may be closed */
    }
  }
}

export async function handleEnrichPersonRequest(
  message: EnrichPersonRequest,
  sender: { tab?: { id?: number } },
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const { contactId, linkedinHandle, requestId } = message.payload;

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    sendResponse({
      payload: { error: "Not authenticated", requestId, success: false },
      type: "ENRICH_PERSON_RESULT",
    });
    return;
  }

  await clearPendingEnrich("Cancelled — a new enrich request was started");

  const senderTabId = sender.tab?.id ?? 0;
  if (!senderTabId) {
    extLog.warn("[background][enrich] missing sender.tab.id — webapp result push may fail");
  }

  backgroundState.pendingEnrich = {
    contactId,
    linkedinHandle,
    linkedinTabId: -1,
    requestId,
    senderTabId,
  };

  const normalizedHandle = (() => {
    try {
      return decodeURIComponent(linkedinHandle);
    } catch {
      return linkedinHandle;
    }
  })();
  const linkedinUrl = `https://www.linkedin.com/in/${encodeURIComponent(normalizedHandle)}/`;
  extLog.debug("[background][enrich] opening LinkedIn tab", {
    linkedinUrl,
    requestId,
    senderTabId,
  });

  const tab = await browser.tabs.create({ active: false, url: linkedinUrl });

  if (!tab.id) {
    backgroundState.pendingEnrich = null;
    sendResponse({
      payload: { error: "Failed to open LinkedIn tab", requestId, success: false },
      type: "ENRICH_PERSON_RESULT",
    });
    return;
  }

  if (backgroundState.pendingEnrich?.requestId === requestId) {
    backgroundState.pendingEnrich.linkedinTabId = tab.id;
  }

  extLog.debug("[background][enrich] tab opened", { linkedinTabId: tab.id, requestId });
  await persistPendingEnrich();
  scheduleEnrichTriggerOnTab(tab.id, requestId);

  await browser.alarms.create("enrich-timeout", { delayInMinutes: ENRICH_TIMEOUT_MINUTES });
  await browser.alarms.create("enrich-keepalive", { periodInMinutes: ENRICH_KEEPALIVE_MINUTES });

  sendResponse({
    payload: { requestId },
    type: "ENRICH_PERSON_ACK",
  });
}

export async function handleEnrichError(
  message: EnrichError,
  _sender: { tab?: { id?: number } },
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const { requestId, error } = message.payload;

  if (!backgroundState.pendingEnrich || backgroundState.pendingEnrich.requestId !== requestId) {
    sendResponse({ payload: { error, requestId, success: false }, type: "ENRICH_PERSON_RESULT" });
    return;
  }

  await clearPendingEnrich(error);
  sendResponse({ payload: { error, requestId, success: false }, type: "ENRICH_PERSON_RESULT" });
}

export async function handleSubmitEnrichData(
  message: SubmitEnrichData,
  sender: { tab?: { id?: number } },
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const { requestId, contactId, profile } = message.payload;

  if (!backgroundState.pendingEnrich || backgroundState.pendingEnrich.requestId !== requestId) {
    sendResponse({
      payload: { error: "No matching enrich request", requestId, success: false },
      type: "ENRICH_PERSON_RESULT",
    });
    return;
  }

  if (sender.tab?.id !== backgroundState.pendingEnrich.linkedinTabId) {
    sendResponse({
      payload: { error: "Unauthorized enrich submission", requestId, success: false },
      type: "ENRICH_PERSON_RESULT",
    });
    return;
  }

  const { senderTabId, linkedinTabId } = backgroundState.pendingEnrich;
  await clearPendingEnrich();

  extLog.debug("[background][enrich] submitting to API", {
    contactId,
    eduCount: profile.educationHistory?.length ?? 0,
    requestId,
    workCount: profile.workHistory?.length ?? 0,
  });

  try {
    await enrichPersonFromLinkedIn(contactId, {
      educationHistory: profile.educationHistory,
      firstName: profile.firstName,
      headline: profile.headline,
      lastName: profile.lastName,
      linkedinBio: profile.linkedinBio,
      location: profile.location,
      middleName: profile.middleName,
      profileImageUrl: profile.profileImageUrl,
      workHistory: profile.workHistory,
    });

    try {
      await browser.tabs.remove(linkedinTabId);
    } catch {
      /* tab may already be closed */
    }

    const result = {
      payload: { contactId, requestId, success: true as const },
      type: "ENRICH_PERSON_RESULT" as const,
    };

    try {
      await browser.tabs.sendMessage(senderTabId, result);
    } catch {
      /* sender tab may be closed */
    }

    sendResponse(result);
  } catch (error) {
    try {
      await browser.tabs.remove(linkedinTabId);
    } catch {
      /* tab may already be closed */
    }

    const result = {
      payload: {
        error: error instanceof Error ? error.message : "Enrich failed",
        requestId,
        success: false as const,
      },
      type: "ENRICH_PERSON_RESULT" as const,
    };

    try {
      await browser.tabs.sendMessage(senderTabId, result);
    } catch {
      /* sender tab may be closed */
    }

    sendResponse(result);
  }
}
