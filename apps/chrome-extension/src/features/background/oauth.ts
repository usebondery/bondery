import { browser } from "wxt/browser";
import { config } from "../../config";
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

export async function handleAuthStatus(sendResponse: (response: unknown) => void): Promise<void> {
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

export async function handleLogin(sendResponse: (response: unknown) => void): Promise<void> {
  extLog.debug("[background][oauth] login-request", {
    apiUrl: config.appUrl,
    loginInProgress: backgroundState.loginInProgress,
    supabaseUrl: config.supabaseUrl,
  });

  if (backgroundState.loginInProgress) {
    sendResponse({
      payload: { error: "Login already in progress", success: false },
      type: "LOGIN_RESULT",
    });
    return;
  }

  backgroundState.loginInProgress = true;

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

export async function initiateOAuthFlow(): Promise<{ success: boolean; error?: string }> {
  try {
    extLog.debug("[background][oauth] flow-start");

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

    extLog.debug("[background][oauth] authorize-request", {
      authBaseUrl,
      authorizeUrl: authUrl.toString(),
      clientId: config.oauthClientId,
      codeChallengePrefix: codeChallenge.slice(0, 12),
      redirectUri,
      statePrefix: state.slice(0, 8),
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
      expectedStatePrefix: state.slice(0, 8),
      hasCode: Boolean(code),
      hasError: Boolean(error),
      hasState: Boolean(returnedState),
      returnedStatePrefix: returnedState?.slice(0, 8) ?? null,
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
        expectedStatePrefix: state.slice(0, 8),
        returnedStatePrefix: returnedState?.slice(0, 8) ?? null,
      });
      return { error: "State mismatch — possible CSRF attack", success: false };
    }

    extLog.debug("[background][oauth] exchange-start", {
      clientId: config.oauthClientId,
      redirectUri,
      tokenEndpoint: `${config.supabaseUrl}/auth/v1/oauth/token`,
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
          `Verify Supabase OAuth app settings: client_id, OAuth server enabled, and redirect URI exact match (${redirectUri}).`,
        success: false,
      };
    }
    return {
      error: error instanceof Error ? error.message : "OAuth flow failed",
      success: false,
    };
  }
}

export async function handleLogout(sendResponse: (response: unknown) => void): Promise<void> {
  await clearTokens();
  backgroundState.pendingPreview = null;
  clearPersonCaches();
  await updateActionContextIndicator();
  sendResponse({ payload: { success: true }, type: "LOGOUT_RESULT" });
}
