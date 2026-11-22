import { browser } from "wxt/browser";
import {
  config,
  getOAuthAuthorizeUrl,
  getOAuthResource,
  getOAuthTokenUrl,
  OAUTH_SCOPE,
} from "../../config";
import {
  clearTokens,
  exchangeCodeForTokens,
  generateCodeChallenge,
  generateCodeVerifier,
  getAccessToken,
  getUserFromToken,
  isAuthenticated,
} from "../../lib/auth";
import { extLog } from "../../lib/log";
import { updateActionContextIndicator } from "./badge";
import { clearPersonCaches } from "./person-cache";
import { backgroundState } from "./state";

/** Random bytes in the OAuth `state` value (hex-encoded to twice this many characters). */
const OAUTH_STATE_BYTES = 16;
/** Radix for hex-encoding bytes. */
const HEX_RADIX = 16;
/** Characters of the PKCE challenge kept in debug logs. */
const CODE_CHALLENGE_LOG_PREFIX_LENGTH = 12;
/** Characters of the OAuth `state` kept in debug logs. */
const STATE_LOG_PREFIX_LENGTH = 8;

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
    payload: { isAuthenticated: authenticated, user },
    type: "AUTH_STATUS_RESPONSE",
  });
}

async function handleLogin(sendResponse: (response: unknown) => void): Promise<void> {
  extLog.debug("[background][oauth] login-request", {
    apiUrl: config.apiUrl,
    loginInProgress: backgroundState.loginInProgress,
  });

  if (backgroundState.loginInProgress) {
    sendResponse({
      payload: { error: "Login already in progress", success: false },
      type: "LOGIN_RESULT",
    });
    return;
  }

  backgroundState.loginInProgress = true;
  await runLoginFlow(sendResponse);
}

async function runLoginFlow(sendResponse: (response: unknown) => void): Promise<void> {
  try {
    const result = await initiateOAuthFlow();
    extLog.debug("[background][oauth] login-result", result);
    sendResponse({ payload: result, type: "LOGIN_RESULT" });

    if (result.success) {
      await updateActionContextIndicator();
    }
  } finally {
    backgroundState.loginInProgress = false;
  }
}

async function initiateOAuthFlow(): Promise<{ success: boolean; error?: string }> {
  try {
    extLog.debug("[background][oauth] flow-start");

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const stateArray = new Uint8Array(OAUTH_STATE_BYTES);
    crypto.getRandomValues(stateArray);
    const state = Array.from(stateArray, (b) => b.toString(HEX_RADIX).padStart(2, "0")).join("");

    const redirectUri = browser.identity.getRedirectURL();

    const authUrl = new URL(getOAuthAuthorizeUrl());
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", config.oauthClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", OAUTH_SCOPE);
    authUrl.searchParams.set("resource", getOAuthResource());

    extLog.debug("[background][oauth] authorize-request", {
      authorizeUrl: authUrl.toString(),
      clientId: config.oauthClientId,
      codeChallengePrefix: codeChallenge.slice(0, CODE_CHALLENGE_LOG_PREFIX_LENGTH),
      redirectUri,
      statePrefix: state.slice(0, STATE_LOG_PREFIX_LENGTH),
    });

    const responseUrl = await browser.identity.launchWebAuthFlow({
      interactive: true,
      url: authUrl.toString(),
    });

    extLog.debug("[background][oauth] authorize-response", {
      hasResponseUrl: Boolean(responseUrl),
      responseUrlPrefix: responseUrl ? responseUrl.slice(0, 200) : null,
    });

    if (!responseUrl) {
      extLog.debug("[background][oauth] no-response-url");
      return { error: "No response from auth flow", success: false };
    }

    const url = new URL(responseUrl);
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    extLog.debug("[background][oauth] callback-params", {
      callbackOrigin: url.origin,
      callbackPath: url.pathname,
      error,
      errorDescription,
      expectedStatePrefix: state.slice(0, STATE_LOG_PREFIX_LENGTH),
      hasCode: Boolean(code),
      hasError: Boolean(error),
      hasState: Boolean(returnedState),
      returnedStatePrefix: returnedState?.slice(0, STATE_LOG_PREFIX_LENGTH) ?? null,
    });

    if (error) {
      return { error: errorDescription ?? error, success: false };
    }

    if (!code) {
      extLog.debug("[background][oauth] missing-code");
      return { error: "No authorization code received", success: false };
    }

    if (returnedState !== state) {
      extLog.debug("[background][oauth] state-mismatch", {
        expectedStatePrefix: state.slice(0, STATE_LOG_PREFIX_LENGTH),
        returnedStatePrefix: returnedState?.slice(0, STATE_LOG_PREFIX_LENGTH) ?? null,
      });
      return { error: "State mismatch — possible CSRF attack", success: false };
    }

    extLog.debug("[background][oauth] exchange-start", {
      clientId: config.oauthClientId,
      redirectUri,
      tokenEndpoint: getOAuthTokenUrl(),
    });

    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);

    if (!tokens) {
      extLog.debug("[background][oauth] exchange-failed");
      return { error: "Failed to exchange code for tokens", success: false };
    }

    extLog.debug("[background][oauth] exchange-success", {
      expiresAt: tokens.expiresAt,
      hasAccessToken: Boolean(tokens.accessToken),
      hasRefreshToken: Boolean(tokens.refreshToken),
      user: getUserFromToken(tokens.accessToken),
    });

    return { success: true };
  } catch (error) {
    extLog.error("[background][oauth] flow-error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const redirectUri = browser.identity.getRedirectURL();
    if (error instanceof Error && error.message.includes("canceled")) {
      return { error: "Login canceled by user", success: false };
    }
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("authorization page could not be loaded")
    ) {
      return {
        error:
          `Authorization page could not be loaded. ` +
          `Verify OAuth client settings: client_id, redirect URI exact match (${redirectUri}), and API reachability.`,
        success: false,
      };
    }
    return {
      error: error instanceof Error ? error.message : "OAuth flow failed",
      success: false,
    };
  }
}

async function handleLogout(sendResponse: (response: unknown) => void): Promise<void> {
  await clearTokens();
  backgroundState.pendingPreview = null;
  clearPersonCaches();
  await updateActionContextIndicator();
  sendResponse({ payload: { success: true }, type: "LOGOUT_RESULT" });
}

export { handleAuthStatus, handleLogin, handleLogout, initiateOAuthFlow };
