import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import {
  CONFIRM_ACTION_PARAM,
  CONFIRM_TARGET_PARAM,
  HAS_RETURNED_PARAM,
  HAS_RETURNED_VALUE,
  parseConfirmTarget,
  type ReconfirmPurpose,
} from "./purposes";

type ReconfirmCallbackOptions = {
  hasReturned?: boolean;
};

function applyReconfirmSearch(
  url: URL,
  purpose: ReconfirmPurpose,
  targetId?: string | null,
  options?: ReconfirmCallbackOptions,
): void {
  url.searchParams.set(CONFIRM_ACTION_PARAM, purpose);
  const target = parseConfirmTarget(targetId);
  if (target) {
    url.searchParams.set(CONFIRM_TARGET_PARAM, target);
  }
  if (options?.hasReturned) {
    url.searchParams.set(HAS_RETURNED_PARAM, HAS_RETURNED_VALUE);
  }
}

/** Step-up method page. Omit `has_returned` for the first Settings navigation. */
export function buildReconfirmCallbackUrl(
  origin: string,
  purpose: ReconfirmPurpose,
  targetId?: string | null,
  options?: ReconfirmCallbackOptions,
): string {
  const url = new URL(WEBAPP_ROUTES.CONFIRM, origin);
  applyReconfirmSearch(url, purpose, targetId, options);
  return url.toString();
}

/** Settings URL after a successful confirm. Must not include `has_returned`. */
export function buildReconfirmSettingsUrl(
  origin: string,
  purpose: ReconfirmPurpose,
  targetId?: string | null,
): string {
  const url = new URL(WEBAPP_ROUTES.SETTINGS, origin);
  applyReconfirmSearch(url, purpose, targetId);
  return url.toString();
}

/**
 * Magic-link / OAuth return URLs for step-up. Must not use `/auth/start`.
 * IdP return stays on `/confirm` with `has_returned=1`.
 */
export function buildReconfirmMagicLinkUrls(
  origin: string,
  purpose: ReconfirmPurpose,
  targetId?: string | null,
): { callbackURL: string; errorCallbackURL: string } {
  const callbackURL = buildReconfirmCallbackUrl(origin, purpose, targetId, { hasReturned: true });
  return { callbackURL, errorCallbackURL: callbackURL };
}
