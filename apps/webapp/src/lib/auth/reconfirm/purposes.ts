import { isValidUuid } from "@bondery/helpers/ids";

export const RECONFIRM_PURPOSES = [
  "add_passkey",
  "link_github",
  "link_linkedin",
  "unlink_github",
  "unlink_linkedin",
  "create_api_key",
  "revoke_api_key",
  "revoke_mcp_consent",
  "delete_account",
] as const;

export type ReconfirmPurpose = (typeof RECONFIRM_PURPOSES)[number];

const PURPOSE_SET = new Set<string>(RECONFIRM_PURPOSES);

export function isReconfirmPurpose(value: string | null | undefined): value is ReconfirmPurpose {
  return typeof value === "string" && PURPOSE_SET.has(value);
}

export function parseReconfirmPurpose(value: string | null | undefined): ReconfirmPurpose | null {
  return isReconfirmPurpose(value) ? value : null;
}

export const CONFIRM_ACTION_PARAM = "action" as const;
export const CONFIRM_TARGET_PARAM = "target" as const;
export const HAS_RETURNED_PARAM = "has_returned" as const;
export const HAS_RETURNED_VALUE = "1" as const;

export function parseConfirmTarget(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return isValidUuid(value) ? value : null;
}

export function parseHasReturned(value: string | null | undefined): boolean {
  return value === HAS_RETURNED_VALUE;
}

/** Drops action, target, and has_returned from a URL. Unknown values are stripped too. */
export function stripReconfirmSearchParam(href: string): string {
  const url = new URL(href, "https://bondery.invalid");
  url.searchParams.delete(CONFIRM_ACTION_PARAM);
  url.searchParams.delete(CONFIRM_TARGET_PARAM);
  url.searchParams.delete(HAS_RETURNED_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}
