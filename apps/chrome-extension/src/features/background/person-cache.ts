import { WEBAPP_ROUTES } from "@bondery/helpers";
import { browser } from "wxt/browser";
import { config } from "../../config";
import {
  addOrFindPerson,
  findPersonBySocial,
  type SocialLookupResult,
} from "../../lib/api/domains/contacts";
import { AuthRequiredError } from "../../lib/api/transport";
import { isAuthenticated } from "../../lib/auth";
import { extLog } from "../../lib/log";
import type {
  AddPersonRequest,
  PersonPreviewData,
  ScrapedProfileData,
} from "../../lib/messaging/types";
import { backgroundState } from "./state";

const personExistenceCache = new Map<string, { result: SocialLookupResult; expiresAt: number }>();
const personExistenceLookupInFlight = new Map<string, Promise<SocialLookupResult | null>>();
export const PERSON_EXISTENCE_CACHE_TTL_MS = 30_000;

export function getPersonExistenceCacheKey(profile: ScrapedProfileData): string {
  return `${profile.platform}:${profile.handle.toLowerCase()}`;
}

export function clearPersonCaches(): void {
  personExistenceCache.clear();
  personExistenceLookupInFlight.clear();
}

function setPersonCacheEntry(cacheKey: string, result: SocialLookupResult): void {
  personExistenceCache.set(cacheKey, {
    expiresAt: Date.now() + PERSON_EXISTENCE_CACHE_TTL_MS,
    result,
  });
}

export function parseProfileFromUrl(rawUrl?: string): ScrapedProfileData | null {
  if (!rawUrl) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname;

  if (hostname.includes("linkedin.com")) {
    const linkedInMatch = pathname.match(/^\/in\/([^/?#]+)\/?$/);
    if (linkedInMatch?.[1]) {
      return {
        handle: decodeURIComponent(linkedInMatch[1]),
        platform: "linkedin",
      };
    }
  }

  if (hostname.includes("instagram.com")) {
    const instagramMatch = pathname.match(/^\/([^/?#]+)\/?$/);
    const reservedPaths = new Set([
      "explore",
      "reels",
      "stories",
      "direct",
      "accounts",
      "settings",
      "p",
      "reel",
    ]);

    if (instagramMatch?.[1] && !reservedPaths.has(instagramMatch[1].toLowerCase())) {
      return {
        handle: decodeURIComponent(instagramMatch[1]),
        platform: "instagram",
      };
    }
  }

  return null;
}

export async function getScrapedProfileFromTab(
  tabId: number,
  tabUrl?: string,
): Promise<ScrapedProfileData | null> {
  const requestScrapedProfile = async (): Promise<ScrapedProfileData | null> => {
    const profile = (await browser.tabs.sendMessage(tabId, {
      type: "GET_SCRAPED_PROFILE",
    })) as ScrapedProfileData | null;

    if (!profile?.platform || !profile.handle) {
      return null;
    }

    return profile;
  };

  try {
    const immediateProfile = await requestScrapedProfile();
    if (immediateProfile) {
      return immediateProfile;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });

    const retryProfile = await requestScrapedProfile();
    if (retryProfile) {
      return retryProfile;
    }

    return parseProfileFromUrl(tabUrl);
  } catch {
    return parseProfileFromUrl(tabUrl);
  }
}

export async function resolvePersonLookup(
  profile: ScrapedProfileData,
): Promise<SocialLookupResult | null> {
  const cacheKey = getPersonExistenceCacheKey(profile);
  const now = Date.now();
  const cached = personExistenceCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.result;
  }

  const inFlight = personExistenceLookupInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const lookupPromise = (async () => {
    try {
      const lookup = await findPersonBySocial(profile.platform, profile.handle);
      setPersonCacheEntry(cacheKey, lookup);
      return lookup;
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        return null;
      }
      return null;
    } finally {
      personExistenceLookupInFlight.delete(cacheKey);
    }
  })();

  personExistenceLookupInFlight.set(cacheKey, lookupPromise);
  return lookupPromise;
}

export async function resolvePersonExists(profile: ScrapedProfileData): Promise<boolean | null> {
  const lookup = await resolvePersonLookup(profile);
  if (!lookup) {
    return null;
  }
  return Boolean(lookup.exists);
}

export async function handleAddPerson(
  message: AddPersonRequest,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const { payload } = message;

  extLog.debug("[background] handleAddPerson called", {
    educationHistoryCount: payload.educationHistory?.length ?? 0,
    handle: payload.handle,
    platform: payload.platform,
    workHistoryCount: payload.workHistory?.length ?? 0,
  });

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    extLog.debug("[background] handleAddPerson: not authenticated");
    sendResponse({
      payload: { error: "Not authenticated", requiresAuth: true, success: false },
      type: "ADD_PERSON_RESULT",
    });
    return;
  }

  try {
    const cacheKey = `${payload.platform}:${payload.handle.toLowerCase()}`;

    const result = await addOrFindPerson({
      [payload.platform]: payload.handle,
      educationHistory: payload.educationHistory,
      firstName: payload.firstName,
      headline: payload.headline,
      lastName: payload.lastName,
      linkedinBio: payload.linkedinBio,
      location: payload.location,
      middleName: payload.middleName,
      notes: payload.notes,
      profileImageUrl: payload.profileImageUrl,
      workHistory: payload.workHistory,
    });

    const contact = result.contact;
    const contactId = contact.id;

    extLog.debug("[background] addOrFindPerson result", {
      contactId,
      existed: result.existed,
    });

    if (result.existed) {
      const previewContact = {
        avatar: contact.avatar ?? payload.profileImageUrl ?? null,
        firstName: contact.firstName ?? payload.firstName ?? payload.handle,
        id: contactId,
        lastName: contact.lastName ?? payload.lastName ?? null,
      };

      setPersonCacheEntry(cacheKey, {
        contact: previewContact,
        exists: true,
      });

      const preview: PersonPreviewData = {
        avatar: contact.avatar ?? payload.profileImageUrl ?? null,
        contactId,
        firstName: contact.firstName ?? payload.firstName ?? payload.handle,
        handle: payload.handle,
        lastName: contact.lastName ?? payload.lastName ?? null,
        platform: payload.platform,
      };

      backgroundState.pendingPreview = preview;

      try {
        await browser.action.openPopup();
      } catch {
        await browser.action.setBadgeText({ text: "1" });
        await browser.action.setBadgeBackgroundColor({ color: "#4CAF50" });
      }

      sendResponse({
        payload: { contactId, existed: true, preview, success: true },
        type: "ADD_PERSON_RESULT",
      });
    } else {
      setPersonCacheEntry(cacheKey, {
        contact: {
          avatar: contact.avatar ?? payload.profileImageUrl ?? null,
          firstName: contact.firstName ?? payload.firstName ?? payload.handle,
          id: contactId,
          lastName: contact.lastName ?? payload.lastName ?? null,
        },
        exists: true,
      });

      const personUrl = `${config.appUrl}${WEBAPP_ROUTES.PERSON}/${contactId}`;
      await browser.tabs.create({ url: personUrl });

      sendResponse({
        payload: { contactId, existed: false, success: true },
        type: "ADD_PERSON_RESULT",
      });
    }
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      sendResponse({
        payload: { error: error.message, requiresAuth: true, success: false },
        type: "ADD_PERSON_RESULT",
      });
    } else {
      extLog.error("[background] Add person error:", error);
      sendResponse({
        payload: {
          error: error instanceof Error ? error.message : "Failed to add person",
          success: false,
        },
        type: "ADD_PERSON_RESULT",
      });
    }
  }
}

export async function handleActiveProfileContext(
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!activeTab?.id) {
    sendResponse({ payload: { supported: false }, type: "ACTIVE_PROFILE_CONTEXT_RESULT" });
    return;
  }

  const profile = await getScrapedProfileFromTab(activeTab.id, activeTab.url);

  if (!profile?.platform || !profile.handle) {
    sendResponse({ payload: { supported: false }, type: "ACTIVE_PROFILE_CONTEXT_RESULT" });
    return;
  }

  try {
    const lookup = await resolvePersonLookup(profile);

    if (!lookup) {
      sendResponse({
        payload: {
          existed: false,
          profile,
          supported: true,
        },
        type: "ACTIVE_PROFILE_CONTEXT_RESULT",
      });
      return;
    }

    if (lookup.exists && lookup.contact) {
      const preview: PersonPreviewData = {
        avatar: lookup.contact.avatar ?? profile.profileImageUrl ?? null,
        contactId: lookup.contact.id,
        firstName: lookup.contact.firstName || profile.firstName || profile.handle,
        handle: profile.handle,
        lastName: lookup.contact.lastName ?? profile.lastName ?? null,
        platform: profile.platform,
      };

      sendResponse({
        payload: {
          existed: true,
          preview,
          profile,
          supported: true,
        },
        type: "ACTIVE_PROFILE_CONTEXT_RESULT",
      });
      return;
    }

    sendResponse({
      payload: {
        existed: false,
        profile,
        supported: true,
      },
      type: "ACTIVE_PROFILE_CONTEXT_RESULT",
    });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      sendResponse({
        payload: {
          existed: false,
          profile,
          supported: true,
        },
        type: "ACTIVE_PROFILE_CONTEXT_RESULT",
      });
      return;
    }

    sendResponse({
      payload: {
        existed: false,
        profile,
        supported: true,
      },
      type: "ACTIVE_PROFILE_CONTEXT_RESULT",
    });
  }
}
