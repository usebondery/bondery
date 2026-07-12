import { WEBAPP_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import {
  REQUEST_PATHNAME_HEADER,
  REQUEST_SEARCH_HEADER,
} from "@/lib/auth/constants";

export const RETURN_INTENT_PARAM = "redirect";

const MAX_RETURN_PATH_LENGTH = 2_048;

const BLOCKED_PATH_PREFIXES = [
  WEBAPP_ROUTES.UNAVAILABLE,
  WEBAPP_ROUTES.LOGIN,
  WEBSITE_ROUTES.LOGIN,
  "/auth/",
] as const;

type SearchParamsLike = {
  get(name: string): string | null;
};

function isOAuthConsentReturnPath(path: string): boolean {
  return path.startsWith("/oauth/consent");
}

export function buildPathWithSearch(pathname: string, search?: string | null): string {
  if (!search) {
    return pathname;
  }

  return search.startsWith("?") ? `${pathname}${search}` : `${pathname}?${search}`;
}

export function isSafeReturnPath(path: string | null | undefined): path is string {
  if (!path || path.length > MAX_RETURN_PATH_LENGTH) {
    return false;
  }

  if (path.startsWith("//") || path.includes("://")) {
    return false;
  }

  if (isOAuthConsentReturnPath(path)) {
    return true;
  }

  if (!path.startsWith("/app/")) {
    return false;
  }

  for (const blocked of BLOCKED_PATH_PREFIXES) {
    if (path === blocked || path.startsWith(blocked)) {
      return false;
    }
  }

  return true;
}

/** Extracts a safe return path, forwarding `redirect` when currently on unavailable. */
export function captureReturnPath(path: string): string | null {
  if (path.startsWith(WEBAPP_ROUTES.UNAVAILABLE)) {
    const queryIndex = path.indexOf("?");
    if (queryIndex >= 0) {
      const params = new URLSearchParams(path.slice(queryIndex + 1));
      return parseReturnIntent(params);
    }

    return null;
  }

  return isSafeReturnPath(path) ? path : null;
}

export function parseReturnIntent(searchParams: SearchParamsLike): string | null {
  const raw = searchParams.get(RETURN_INTENT_PARAM);
  return isSafeReturnPath(raw) ? raw : null;
}

export function buildLoginUrl(returnPath: string): string {
  const captured = captureReturnPath(returnPath);
  if (!captured) {
    return WEBSITE_ROUTES.LOGIN;
  }

  return `${WEBSITE_ROUTES.LOGIN}?${RETURN_INTENT_PARAM}=${encodeURIComponent(captured)}`;
}

export function buildUnavailableUrl(returnPath: string): string {
  const captured = captureReturnPath(returnPath);
  if (!captured) {
    return WEBAPP_ROUTES.UNAVAILABLE;
  }

  return `${WEBAPP_ROUTES.UNAVAILABLE}?${RETURN_INTENT_PARAM}=${encodeURIComponent(captured)}`;
}

export function captureClientReturnPath(): string {
  if (typeof window === "undefined") {
    return WEBAPP_ROUTES.HOME;
  }

  return buildPathWithSearch(window.location.pathname, window.location.search);
}

export function getClientReturnPathForLogin(): string {
  return captureReturnPath(captureClientReturnPath()) ?? WEBAPP_ROUTES.HOME;
}

export function getRequestReturnPath(headersList: { get(name: string): string | null }): string {
  const pathname = headersList.get(REQUEST_PATHNAME_HEADER) ?? "";
  const search = headersList.get(REQUEST_SEARCH_HEADER) ?? "";
  return buildPathWithSearch(pathname, search);
}

export function getRequestReturnPathForLogin(headersList: {
  get(name: string): string | null;
}): string {
  return captureReturnPath(getRequestReturnPath(headersList)) ?? WEBAPP_ROUTES.HOME;
}

export function shouldBypassOnboardingForReturnPath(path: string | null): path is string {
  if (!isSafeReturnPath(path)) {
    return false;
  }

  if (isOAuthConsentReturnPath(path)) {
    return false;
  }

  return path !== WEBAPP_ROUTES.HOME && !path.startsWith(WEBAPP_ROUTES.ONBOARDING);
}
