/**
 * Background Service Worker Entry Point (WXT)
 *
 * This wraps the existing background service worker code for WXT.
 */
import { defineBackground } from "#imports";
import { browser } from "wxt/browser";

export default defineBackground(() => {
  // Import and initialize the background script
  initBackground();
});

// ─────────────────────────────────────────────────────────────────────────────
// All background logic is moved into a function to comply with WXT's requirements
// that runtime code must be inside the defineBackground callback.
// ─────────────────────────────────────────────────────────────────────────────

import { config } from "../../config";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  exchangeCodeForTokens,
  getAccessToken,
  getTokens,
  clearTokens,
  isAuthenticated,
  getUserFromToken,
  refreshAccessToken,
} from "../../utils/auth";
import {
  addOrFindPerson,
  fetchPersonPreview,
  findPersonBySocial,
  enrichPersonFromLinkedIn,
  AuthRequiredError,
  type SocialLookupResult,
} from "../../utils/api";
import type {
  ExtensionMessage,
  AddPersonRequest,
  EnrichPersonRequest,
  EnrichError,
  SubmitEnrichData,
  PersonPreviewData,
  ScrapedProfileData,
} from "../../utils/messages";
import { WEBAPP_ROUTES } from "@bondery/helpers";

// ─── State ───────────────────────────────────────────────────────────────────

/** Pending person preview to show in popup (set by service worker, read by popup) */
let pendingPreview: PersonPreviewData | null = null;

/** Lock to prevent concurrent login flows */
let loginInProgress = false;

/** Pending enrich request (webapp → LinkedIn tab → background → API → webapp) */
let pendingEnrich: {
  contactId: string;
  linkedinHandle: string;
  requestId: string;
  linkedinTabId: number;
  senderTabId: number;
} | null = null;

/** Debounce timer for badge indicator updates */
let indicatorUpdateTimer: ReturnType<typeof setTimeout> | null = null;

/** Cache person existence lookups to avoid repeated API calls during reload/navigation churn */
const personExistenceCache = new Map<string, { result: SocialLookupResult; expiresAt: number }>();
const personExistenceLookupInFlight = new Map<string, Promise<SocialLookupResult | null>>();
const PERSON_EXISTENCE_CACHE_TTL_MS = 30_000;

const BADGE_TEXT_INDICATOR = " ";
const BADGE_COLOR_ON_BONDERY = "var(--mantine-primary-color-filled)";
const BADGE_COLOR_PERSON_EXISTS = "var(--mantine-color-green-filled)";
const BADGE_COLOR_OFF_BONDERY = "var(--mantine-color-yellow-filled)";
const BADGE_COLOR_UNAUTHENTICATED = "var(--mantine-color-orange-filled)";

const BADGE_COLOR_ON_BONDERY_FALLBACK = "purple";
const BADGE_COLOR_PERSON_EXISTS_FALLBACK = "green";
const BADGE_COLOR_OFF_BONDERY_FALLBACK = "yellow";
const BADGE_COLOR_UNAUTHENTICATED_FALLBACK = "orange";

async function setBadgeBackgroundColorSafely(color: string, fallback: string): Promise<void> {
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

function getPersonExistenceCacheKey(profile: ScrapedProfileData): string {
  return `${profile.platform}:${profile.handle.toLowerCase()}`;
}

function parseProfileFromUrl(rawUrl?: string): ScrapedProfileData | null {
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
    const linkedInMatch = pathname.match(/^\/in\/([^\/?#]+)\/?$/);
    if (linkedInMatch?.[1]) {
      return {
        platform: "linkedin",
        handle: decodeURIComponent(linkedInMatch[1]),
      };
    }
  }

  if (hostname.includes("instagram.com")) {
    const instagramMatch = pathname.match(/^\/([^\/?#]+)\/?$/);
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
        platform: "instagram",
        handle: decodeURIComponent(instagramMatch[1]),
      };
    }
  }

  return null;
}

async function getScrapedProfileFromTab(
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

async function resolvePersonLookup(
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
      personExistenceCache.set(cacheKey, {
        result: lookup,
        expiresAt: Date.now() + PERSON_EXISTENCE_CACHE_TTL_MS,
      });
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

async function resolvePersonExists(profile: ScrapedProfileData): Promise<boolean | null> {
  const lookup = await resolvePersonLookup(profile);
  if (!lookup) {
    return null;
  }
  return Boolean(lookup.exists);
}

async function updateActionContextIndicator(): Promise<void> {
  try {
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

    const profile = await getScrapedProfileFromTab(activeTab.id, activeTab.url);
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
    console.error("[background] Failed to update action context indicator:", error);
  }
}

function scheduleActionContextIndicatorUpdate(delayMs = 200): void {
  if (indicatorUpdateTimer) {
    clearTimeout(indicatorUpdateTimer);
  }

  indicatorUpdateTimer = setTimeout(() => {
    updateActionContextIndicator();
  }, delayMs);
}

// ─── Message Handlers ────────────────────────────────────────────────────────

async function handleAuthStatus(sendResponse: (response: unknown) => void): Promise<void> {
  const authenticated = await isAuthenticated();
  let user: { id: string; email: string } | undefined;

  if (authenticated) {
    const token = await getAccessToken();
    if (token) {
      const decoded = getUserFromToken(token);
      if (decoded) {
        user = decoded;
      }
    }
  }

  sendResponse({
    type: "AUTH_STATUS_RESPONSE",
    payload: { isAuthenticated: authenticated, user },
  });
}

async function handleLogin(sendResponse: (response: unknown) => void): Promise<void> {
  console.log("[background][oauth] login-request", {
    loginInProgress,
    supabaseUrl: config.supabaseUrl,
    apiUrl: config.appUrl,
  });

  if (loginInProgress) {
    sendResponse({
      type: "LOGIN_RESULT",
      payload: { success: false, error: "Login already in progress" },
    });
    return;
  }

  loginInProgress = true;

  try {
    const result = await initiateOAuthFlow();
    console.log("[background][oauth] login-result", result);
    sendResponse({ type: "LOGIN_RESULT", payload: result });

    if (result.success) {
      await updateActionContextIndicator();
    }
  } finally {
    loginInProgress = false;
  }
}

async function initiateOAuthFlow(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[background][oauth] flow-start");

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const stateArray = new Uint8Array(16);
    crypto.getRandomValues(stateArray);
    const state = Array.from(stateArray, (b) => b.toString(16).padStart(2, "0")).join("");

    const redirectUri = browser.identity.getRedirectURL();

    const authBaseUrl = config.supabaseUrl.replace("http://localhost:", "http://127.0.0.1:");
    const authUrl = new URL(`${authBaseUrl}/auth/v1/oauth/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", config.oauthClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", "openid email profile");

    console.log("[background][oauth] authorize-request", {
      authBaseUrl,
      authorizeUrl: authUrl.toString(),
      redirectUri,
      clientId: config.oauthClientId,
      statePrefix: state.slice(0, 8),
      codeChallengePrefix: codeChallenge.slice(0, 12),
    });

    const responseUrl = await browser.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    });

    console.log("[background][oauth] authorize-response", {
      hasResponseUrl: Boolean(responseUrl),
      responseUrlPrefix: responseUrl ? responseUrl.slice(0, 200) : null,
    });

    if (!responseUrl) {
      console.log("[background][oauth] no-response-url");
      return { success: false, error: "No response from auth flow" };
    }

    const url = new URL(responseUrl);
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    console.log("[background][oauth] callback-params", {
      callbackOrigin: url.origin,
      callbackPath: url.pathname,
      hasError: Boolean(error),
      error,
      errorDescription,
      hasCode: Boolean(code),
      hasState: Boolean(returnedState),
      returnedStatePrefix: returnedState?.slice(0, 8) ?? null,
      expectedStatePrefix: state.slice(0, 8),
    });

    if (error) {
      return { success: false, error: errorDescription ?? error };
    }

    if (!code) {
      console.log("[background][oauth] missing-code");
      return { success: false, error: "No authorization code received" };
    }

    if (returnedState !== state) {
      console.log("[background][oauth] state-mismatch", {
        expectedStatePrefix: state.slice(0, 8),
        returnedStatePrefix: returnedState?.slice(0, 8) ?? null,
      });
      return { success: false, error: "State mismatch — possible CSRF attack" };
    }

    console.log("[background][oauth] exchange-start", {
      tokenEndpoint: `${config.supabaseUrl}/auth/v1/oauth/token`,
      redirectUri,
      clientId: config.oauthClientId,
    });

    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);

    if (!tokens) {
      console.log("[background][oauth] exchange-failed");
      return { success: false, error: "Failed to exchange code for tokens" };
    }

    console.log("[background][oauth] exchange-success", {
      expiresAt: tokens.expiresAt,
      hasAccessToken: Boolean(tokens.accessToken),
      hasRefreshToken: Boolean(tokens.refreshToken),
      user: getUserFromToken(tokens.accessToken),
    });

    return { success: true };
  } catch (error) {
    console.error("[background][oauth] flow-error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const redirectUri = browser.identity.getRedirectURL();
    if (error instanceof Error && error.message.includes("canceled")) {
      return { success: false, error: "Login canceled by user" };
    }
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("authorization page could not be loaded")
    ) {
      return {
        success: false,
        error:
          `Authorization page could not be loaded. ` +
          `Verify Supabase OAuth app settings: client_id, OAuth server enabled, and redirect URI exact match (${redirectUri}).`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "OAuth flow failed",
    };
  }
}

async function handleLogout(sendResponse: (response: unknown) => void): Promise<void> {
  await clearTokens();
  pendingPreview = null;
  personExistenceCache.clear();
  personExistenceLookupInFlight.clear();
  await updateActionContextIndicator();
  sendResponse({ type: "LOGOUT_RESULT", payload: { success: true } });
}

async function handleAddPerson(
  message: AddPersonRequest,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const { payload } = message;

  console.log("[background] handleAddPerson called", {
    platform: payload.platform,
    handle: payload.handle,
    workHistoryCount: payload.workHistory?.length ?? 0,
    educationHistoryCount: payload.educationHistory?.length ?? 0,
  });

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.log("[background] handleAddPerson: not authenticated");
    sendResponse({
      type: "ADD_PERSON_RESULT",
      payload: { success: false, error: "Not authenticated", requiresAuth: true },
    });
    return;
  }

  try {
    const cacheKey = `${payload.platform}:${payload.handle.toLowerCase()}`;

    const result = await addOrFindPerson({
      [payload.platform]: payload.handle,
      firstName: payload.firstName,
      middleName: payload.middleName,
      lastName: payload.lastName,
      profileImageUrl: payload.profileImageUrl,
      headline: payload.headline,
      place: payload.place,
      notes: payload.notes,
      workHistory: payload.workHistory,
      educationHistory: payload.educationHistory,
      linkedinBio: payload.linkedinBio,
    });

    console.log("[background] addOrFindPerson result", {
      contactId: result.contactId,
      existed: result.existed,
    });

    if (result.existed) {
      const previewContact = {
        id: result.contactId,
        firstName: result.firstName ?? payload.firstName ?? payload.handle,
        lastName: result.lastName ?? payload.lastName ?? null,
        avatar: result.avatar ?? payload.profileImageUrl ?? null,
      };

      personExistenceCache.set(cacheKey, {
        result: {
          exists: true,
          contact: previewContact,
        },
        expiresAt: Date.now() + PERSON_EXISTENCE_CACHE_TTL_MS,
      });

      let preview: PersonPreviewData;

      if (result.firstName) {
        preview = {
          contactId: result.contactId,
          firstName: result.firstName,
          lastName: result.lastName ?? null,
          avatar: result.avatar ?? null,
          platform: payload.platform,
          handle: payload.handle,
        };
      } else {
        try {
          const personData = await fetchPersonPreview(result.contactId);
          preview = {
            contactId: result.contactId,
            firstName: personData.firstName,
            lastName: personData.lastName,
            avatar: personData.avatar,
            platform: payload.platform,
            handle: payload.handle,
          };
        } catch {
          preview = {
            contactId: result.contactId,
            firstName: payload.firstName ?? payload.handle,
            lastName: payload.lastName ?? null,
            avatar: payload.profileImageUrl ?? null,
            platform: payload.platform,
            handle: payload.handle,
          };
        }
      }

      pendingPreview = preview;

      try {
        await browser.action.openPopup();
      } catch {
        await browser.action.setBadgeText({ text: "1" });
        await browser.action.setBadgeBackgroundColor({ color: "#4CAF50" });
      }

      sendResponse({
        type: "ADD_PERSON_RESULT",
        payload: { success: true, existed: true, contactId: result.contactId, preview },
      });
    } else {
      personExistenceCache.set(cacheKey, {
        result: {
          exists: true,
          contact: {
            id: result.contactId,
            firstName: payload.firstName ?? payload.handle,
            lastName: payload.lastName ?? null,
            avatar: payload.profileImageUrl ?? null,
          },
        },
        expiresAt: Date.now() + PERSON_EXISTENCE_CACHE_TTL_MS,
      });

      const personUrl = `${config.appUrl}${WEBAPP_ROUTES.PERSON}/${result.contactId}`;
      await browser.tabs.create({ url: personUrl });

      sendResponse({
        type: "ADD_PERSON_RESULT",
        payload: { success: true, existed: false, contactId: result.contactId },
      });
    }
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      sendResponse({
        type: "ADD_PERSON_RESULT",
        payload: { success: false, error: error.message, requiresAuth: true },
      });
    } else {
      console.error("[background] Add person error:", error);
      sendResponse({
        type: "ADD_PERSON_RESULT",
        payload: {
          success: false,
          error: error instanceof Error ? error.message : "Failed to add person",
        },
      });
    }
  }
}

async function handleActiveProfileContext(
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!activeTab?.id) {
    sendResponse({ type: "ACTIVE_PROFILE_CONTEXT_RESULT", payload: { supported: false } });
    return;
  }

  const profile = await getScrapedProfileFromTab(activeTab.id, activeTab.url);

  if (!profile?.platform || !profile.handle) {
    sendResponse({ type: "ACTIVE_PROFILE_CONTEXT_RESULT", payload: { supported: false } });
    return;
  }

  try {
    const lookup = await resolvePersonLookup(profile);

    if (!lookup) {
      sendResponse({
        type: "ACTIVE_PROFILE_CONTEXT_RESULT",
        payload: {
          supported: true,
          profile,
          existed: false,
        },
      });
      return;
    }

    if (lookup.exists && lookup.contact) {
      const preview: PersonPreviewData = {
        contactId: lookup.contact.id,
        firstName: lookup.contact.firstName || profile.firstName || profile.handle,
        lastName: lookup.contact.lastName ?? profile.lastName ?? null,
        avatar: lookup.contact.avatar ?? profile.profileImageUrl ?? null,
        platform: profile.platform,
        handle: profile.handle,
      };

      sendResponse({
        type: "ACTIVE_PROFILE_CONTEXT_RESULT",
        payload: {
          supported: true,
          profile,
          existed: true,
          preview,
        },
      });
      return;
    }

    sendResponse({
      type: "ACTIVE_PROFILE_CONTEXT_RESULT",
      payload: {
        supported: true,
        profile,
        existed: false,
      },
    });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      sendResponse({
        type: "ACTIVE_PROFILE_CONTEXT_RESULT",
        payload: {
          supported: true,
          profile,
          existed: false,
        },
      });
      return;
    }

    sendResponse({
      type: "ACTIVE_PROFILE_CONTEXT_RESULT",
      payload: {
        supported: true,
        profile,
        existed: false,
      },
    });
  }
}

// ─── Enrich Handlers ─────────────────────────────────────────────────────────

const ENRICH_TIMEOUT_MINUTES = 1.5; // Chrome alarms minimum is 1 min; 1.5 min ≈ 90s
const ENRICH_KEEPALIVE_MINUTES = 0.4; // Fires every ~24s to keep SW alive

/**
 * Clears the pending enrich state, cancels alarms, and optionally notifies
 * the old request’s webapp tab so its notification doesn’t hang.
 *
 * @param reason If provided, sends a failure result to the webapp tab with this error message.
 */
async function clearPendingEnrich(reason?: string): Promise<void> {
  if (!pendingEnrich) return;

  const { senderTabId, linkedinTabId, requestId } = pendingEnrich;
  pendingEnrich = null;

  // Cancel alarms
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
    // Close the LinkedIn tab
    try {
      await browser.tabs.remove(linkedinTabId);
    } catch {
      /* tab may already be closed */
    }

    // Notify the webapp tab so the loading notification resolves immediately
    try {
      await browser.tabs.sendMessage(senderTabId, {
        type: "ENRICH_PERSON_RESULT",
        payload: { requestId, success: false, error: reason },
      });
    } catch {
      /* sender tab may be closed */
    }
  }
}

async function handleEnrichPersonRequest(
  message: EnrichPersonRequest,
  sender: { tab?: { id?: number } },
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const { contactId, linkedinHandle, requestId } = message.payload;

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    sendResponse({
      type: "ENRICH_PERSON_RESULT",
      payload: { requestId, success: false, error: "Not authenticated" },
    });
    return;
  }

  // Cancel any existing pending enrich, notifying the old request’s webapp tab
  await clearPendingEnrich("Cancelled — a new enrich request was started");

  const senderTabId = sender.tab?.id ?? 0;

  // Open a LinkedIn tab for the target profile
  // Decode first to normalize (handle may already be URL-encoded in the DB),
  // then re-encode to produce a valid URL without double-encoding %xx sequences.
  const normalizedHandle = (() => {
    try {
      return decodeURIComponent(linkedinHandle);
    } catch {
      return linkedinHandle;
    }
  })();
  const linkedinUrl = `https://www.linkedin.com/in/${encodeURIComponent(normalizedHandle)}/`;
  const tab = await browser.tabs.create({ url: linkedinUrl, active: false });

  if (!tab.id) {
    sendResponse({
      type: "ENRICH_PERSON_RESULT",
      payload: { requestId, success: false, error: "Failed to open LinkedIn tab" },
    });
    return;
  }

  // Use alarms instead of setTimeout to survive SW idle termination.
  // The timeout alarm fires once after ~90s; the keepalive alarm pings
  // periodically (~24s) to prevent Chrome from killing the SW mid-enrich.
  await browser.alarms.create("enrich-timeout", { delayInMinutes: ENRICH_TIMEOUT_MINUTES });
  await browser.alarms.create("enrich-keepalive", { periodInMinutes: ENRICH_KEEPALIVE_MINUTES });

  pendingEnrich = {
    contactId,
    linkedinHandle,
    requestId,
    linkedinTabId: tab.id,
    senderTabId,
  };

  // Respond with a typed ack so the webapp.content bridge’s
  // runtime.sendMessage promise resolves. The real result arrives
  // asynchronously via tabs.sendMessage → runtime.onMessage push.
  sendResponse({
    type: "ENRICH_PERSON_ACK",
    payload: { requestId },
  });
}

async function handleEnrichError(
  message: EnrichError,
  sender: { tab?: { id?: number } },
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const { requestId, error } = message.payload;

  if (!pendingEnrich || pendingEnrich.requestId !== requestId) {
    sendResponse({ type: "ENRICH_PERSON_RESULT", payload: { requestId, success: false, error } });
    return;
  }

  // Clear state and relay the error to the webapp immediately
  await clearPendingEnrich(error);
  sendResponse({ type: "ENRICH_PERSON_RESULT", payload: { requestId, success: false, error } });
}

async function handleSubmitEnrichData(
  message: SubmitEnrichData,
  sender: { tab?: { id?: number } },
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const { requestId, contactId, profile } = message.payload;

  if (!pendingEnrich || pendingEnrich.requestId !== requestId) {
    sendResponse({
      type: "ENRICH_PERSON_RESULT",
      payload: { requestId, success: false, error: "No matching enrich request" },
    });
    return;
  }

  // Validate that the data is coming from the LinkedIn tab we opened
  if (sender.tab?.id !== pendingEnrich.linkedinTabId) {
    sendResponse({
      type: "ENRICH_PERSON_RESULT",
      payload: { requestId, success: false, error: "Unauthorized enrich submission" },
    });
    return;
  }

  const { senderTabId, linkedinTabId } = pendingEnrich;
  await clearPendingEnrich();

  try {
    await enrichPersonFromLinkedIn(contactId, {
      firstName: profile.firstName,
      middleName: profile.middleName,
      lastName: profile.lastName,
      profileImageUrl: profile.profileImageUrl,
      headline: profile.headline,
      place: profile.place,
      linkedinBio: profile.linkedinBio,
      workHistory: profile.workHistory,
      educationHistory: profile.educationHistory,
    });

    // Close the LinkedIn tab
    try {
      await browser.tabs.remove(linkedinTabId);
    } catch {
      /* tab may already be closed */
    }

    // Relay success to the webapp tab
    const result = {
      type: "ENRICH_PERSON_RESULT" as const,
      payload: { requestId, success: true as const, contactId },
    };

    try {
      await browser.tabs.sendMessage(senderTabId, result);
    } catch {
      /* sender tab may be closed */
    }

    sendResponse(result);
  } catch (error) {
    // Close the LinkedIn tab
    try {
      await browser.tabs.remove(linkedinTabId);
    } catch {
      /* tab may already be closed */
    }

    const result = {
      type: "ENRICH_PERSON_RESULT" as const,
      payload: {
        requestId,
        success: false as const,
        error: error instanceof Error ? error.message : "Enrich failed",
      },
    };

    try {
      await browser.tabs.sendMessage(senderTabId, result);
    } catch {
      /* sender tab may be closed */
    }

    sendResponse(result);
  }
}

async function handleMessage(
  message: ExtensionMessage,
  sender: { tab?: { id?: number } },
  sendResponse: (response: unknown) => void,
): Promise<void> {
  try {
    switch (message.type) {
      case "AUTH_STATUS_REQUEST":
        await handleAuthStatus(sendResponse);
        break;

      case "LOGIN_REQUEST":
        await handleLogin(sendResponse);
        break;

      case "LOGOUT_REQUEST":
        await handleLogout(sendResponse);
        break;

      case "ADD_PERSON_REQUEST":
        await handleAddPerson(message, sendResponse);
        break;

      case "GET_PENDING_PREVIEW":
        sendResponse({
          type: "PENDING_PREVIEW_RESULT",
          payload: pendingPreview,
        });
        pendingPreview = null;
        break;

      case "GET_ACTIVE_PROFILE_CONTEXT":
        await handleActiveProfileContext(sendResponse);
        break;

      case "ENRICH_PERSON_REQUEST":
        await handleEnrichPersonRequest(message, sender, sendResponse);
        break;

      case "GET_ENRICH_CONTEXT":
        // LinkedIn content script asking if it should auto-enrich
        if (pendingEnrich && sender.tab?.id === pendingEnrich.linkedinTabId) {
          sendResponse({
            type: "ENRICH_CONTEXT_RESULT",
            payload: {
              contactId: pendingEnrich.contactId,
              linkedinHandle: pendingEnrich.linkedinHandle,
              requestId: pendingEnrich.requestId,
            },
          });
        } else {
          sendResponse({
            type: "ENRICH_CONTEXT_RESULT",
            payload: null,
          });
        }
        break;

      case "SUBMIT_ENRICH_DATA":
        await handleSubmitEnrichData(message, sender, sendResponse);
        break;

      case "ENRICH_ERROR":
        await handleEnrichError(message, sender, sendResponse);
        break;

      case "ENRICH_CONTEXT_RESULT":
        // This message type is sent TO content scripts, not FROM them.
        // If it arrives here unexpectedly, ignore it.
        break;

      default:
        sendResponse({ type: "ERROR", payload: { error: "Unknown message type" } });
    }
  } catch (error) {
    console.error("[background] Message handler error:", error);
    sendResponse({
      type: "ERROR",
      payload: { error: error instanceof Error ? error.message : "Unknown error" },
    });
  }
}

// ─── Initialization ──────────────────────────────────────────────────────────

function initBackground(): void {
  // Install handler
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
      const welcomeUrl = browser.runtime.getURL("welcome.html");
      await browser.tabs.create({ url: welcomeUrl });
    } else if (details.reason === "update") {
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

  // Message handler
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, sender, sendResponse: (response: unknown) => void) => {
      handleMessage(message, sender, sendResponse);
      return true;
    },
  );

  // Periodic token refresh alarm
  browser.alarms.create("token-refresh", { periodInMinutes: 15 });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "token-refresh") {
      const tokens = await getTokens();
      if (!tokens) return;

      const now = Math.floor(Date.now() / 1000);
      const REFRESH_BUFFER = 600;

      if (tokens.expiresAt < now + REFRESH_BUFFER) {
        console.log("[background] Proactively refreshing token...");
        await refreshAccessToken();
      }
    }

    // Enrich timeout — fired once by the "enrich-timeout" alarm
    if (alarm.name === "enrich-timeout" && pendingEnrich) {
      await clearPendingEnrich("Enrich timed out");
    }

    // Enrich keepalive — periodic alarm that keeps the SW alive.
    // No-op when there’s no pending enrich; clear it to stop pinging.
    if (alarm.name === "enrich-keepalive" && !pendingEnrich) {
      try {
        await browser.alarms.clear("enrich-keepalive");
      } catch {
        /* ok */
      }
    }
  });

  console.log("[background] Service worker initialized");
}
