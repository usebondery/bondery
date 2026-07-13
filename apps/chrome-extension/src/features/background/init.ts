import { browser } from "wxt/browser";
import { getTokens, isAuthenticated, refreshAccessToken } from "../../lib/auth";
import { extLog } from "../../lib/log";
import type { ExtensionMessage } from "../../lib/messaging/types";
import {
  BADGE_COLOR_UNAUTHENTICATED,
  BADGE_COLOR_UNAUTHENTICATED_FALLBACK,
  BADGE_TEXT_INDICATOR,
  scheduleActionContextIndicatorUpdate,
  setBadgeBackgroundColorSafely,
  updateActionContextIndicator,
} from "./badge";
import { clearPendingEnrich, restorePendingEnrichIfAny } from "./enrich";
import { handleMessage } from "./message-router";
import { backgroundState } from "./state";
import { checkVersionCompatibility } from "./version-check";

export function initBackground(): void {
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
      const welcomeUrl = browser.runtime.getURL("welcome.html");
      await browser.tabs.create({ url: welcomeUrl });
    } else if (details.reason === "update") {
      await browser.storage.local.remove("updateRequired");

      const authenticated = await isAuthenticated();
      if (!authenticated) {
        await browser.action.setBadgeText({ text: BADGE_TEXT_INDICATOR });
        await setBadgeBackgroundColorSafely(
          BADGE_COLOR_UNAUTHENTICATED,
          BADGE_COLOR_UNAUTHENTICATED_FALLBACK,
        );
      }
    }

    await updateActionContextIndicator();
  });

  browser.runtime.onStartup.addListener(async () => {
    scheduleActionContextIndicatorUpdate();
  });

  browser.tabs.onActivated.addListener(() => {
    scheduleActionContextIndicatorUpdate();
  });

  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (!tab.active) {
      return;
    }

    if (changeInfo.status === "complete" || changeInfo.url) {
      scheduleActionContextIndicatorUpdate();
    }
  });

  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, sender, sendResponse: (response: unknown) => void) => {
      void handleMessage(message, sender, sendResponse);
      return true;
    },
  );

  browser.alarms.create("token-refresh", { periodInMinutes: 15 });
  browser.alarms.create("version-check", { periodInMinutes: 60 });

  void checkVersionCompatibility();

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "version-check") {
      await checkVersionCompatibility();
    }

    if (alarm.name === "token-refresh") {
      const tokens = await getTokens();
      if (!tokens) {
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const REFRESH_BUFFER = 600;

      if (tokens.expiresAt < now + REFRESH_BUFFER) {
        extLog.debug("[background] Proactively refreshing token...");
        await refreshAccessToken();
      }
    }

    if (alarm.name === "enrich-timeout" && backgroundState.pendingEnrich) {
      await clearPendingEnrich("Enrich timed out");
    }

    if (alarm.name === "enrich-keepalive" && !backgroundState.pendingEnrich) {
      try {
        await browser.alarms.clear("enrich-keepalive");
      } catch {
        /* ok */
      }
    }
  });

  void restorePendingEnrichIfAny();

  extLog.debug("[background] Service worker initialized");
}
