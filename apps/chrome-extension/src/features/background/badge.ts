import { browser } from "wxt/browser";
import { config } from "../../config";
import { isAuthenticated } from "../../lib/auth";
import { extLog } from "../../lib/log";
import type { ScrapedProfileData } from "../../lib/messaging/types";
import { getScrapedProfileFromTab, resolvePersonExists } from "./person-cache";
import { backgroundState } from "./state";

export const BADGE_TEXT_INDICATOR = " ";
const BADGE_COLOR_ON_BONDERY = "var(--mantine-primary-color-filled)";
const BADGE_COLOR_PERSON_EXISTS = "var(--mantine-color-green-filled)";
const BADGE_COLOR_OFF_BONDERY = "var(--mantine-color-yellow-filled)";
export const BADGE_COLOR_UNAUTHENTICATED = "var(--mantine-color-orange-filled)";

const BADGE_COLOR_UPDATE_REQUIRED = "var(--mantine-color-red-filled)";
export const BADGE_COLOR_UPDATE_REQUIRED_FALLBACK = "red";
const BADGE_COLOR_ON_BONDERY_FALLBACK = "purple";
const BADGE_COLOR_PERSON_EXISTS_FALLBACK = "green";
const BADGE_COLOR_OFF_BONDERY_FALLBACK = "yellow";
export const BADGE_COLOR_UNAUTHENTICATED_FALLBACK = "orange";

export async function setBadgeBackgroundColorSafely(
  color: string,
  fallback: string,
): Promise<void> {
  try {
    await browser.action.setBadgeBackgroundColor({ color });
  } catch {
    await browser.action.setBadgeBackgroundColor({ color: fallback });
  }
}

async function setUndeterminedBadge(): Promise<void> {
  await browser.action.setBadgeText({ text: "" });
}

async function setDeterminedBadge(color: string, fallback: string): Promise<void> {
  await browser.action.setBadgeText({ text: BADGE_TEXT_INDICATOR });
  await setBadgeBackgroundColorSafely(color, fallback);
}

export async function updateActionContextIndicator(): Promise<void> {
  try {
    const { updateRequired = false } = await browser.storage.local.get("updateRequired");
    if (updateRequired) {
      await setDeterminedBadge(BADGE_COLOR_UPDATE_REQUIRED, BADGE_COLOR_UPDATE_REQUIRED_FALLBACK);
      return;
    }

    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    const tabUrl = activeTab?.url || "";
    const onBondery = tabUrl.startsWith(config.appUrl);
    const authenticated = await isAuthenticated();

    if (!authenticated) {
      await setDeterminedBadge(BADGE_COLOR_UNAUTHENTICATED, BADGE_COLOR_UNAUTHENTICATED_FALLBACK);
      return;
    }

    await setUndeterminedBadge();

    if (onBondery) {
      await setDeterminedBadge(BADGE_COLOR_ON_BONDERY, BADGE_COLOR_ON_BONDERY_FALLBACK);
      return;
    }

    if (!activeTab?.id) {
      return;
    }

    const profile: ScrapedProfileData | null = await getScrapedProfileFromTab(
      activeTab.id,
      activeTab.url,
    );
    if (!profile) {
      return;
    }

    const exists = await resolvePersonExists(profile);
    if (exists === null) {
      await setDeterminedBadge(BADGE_COLOR_OFF_BONDERY, BADGE_COLOR_OFF_BONDERY_FALLBACK);
      return;
    }

    if (exists) {
      await setDeterminedBadge(BADGE_COLOR_PERSON_EXISTS, BADGE_COLOR_PERSON_EXISTS_FALLBACK);
      return;
    }

    await setDeterminedBadge(BADGE_COLOR_OFF_BONDERY, BADGE_COLOR_OFF_BONDERY_FALLBACK);
  } catch (error) {
    extLog.error("[background] Failed to update action context indicator:", error);
  }
}

export function scheduleActionContextIndicatorUpdate(delayMs = 200): void {
  if (backgroundState.indicatorUpdateTimer) {
    clearTimeout(backgroundState.indicatorUpdateTimer);
  }

  backgroundState.indicatorUpdateTimer = setTimeout(() => {
    void updateActionContextIndicator();
  }, delayMs);
}
