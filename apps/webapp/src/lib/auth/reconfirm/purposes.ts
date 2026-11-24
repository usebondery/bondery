import { isValidUuid } from "@bondery/helpers/ids";

const RECONFIRM_PURPOSES = [
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

const PURPOSE_SET = new Set<string>(RECONFIRM_PURPOSES);

type ReconfirmPurpose = (typeof RECONFIRM_PURPOSES)[number];

const CONFIRM_ACTION_PARAM = "action" as const;
const CONFIRM_TARGET_PARAM = "target" as const;
const HAS_RETURNED_PARAM = "has_returned" as const;
const HAS_RETURNED_VALUE = "1" as const;

function isReconfirmPurpose(value: string | null | undefined): value is ReconfirmPurpose {
  return typeof value === "string" && PURPOSE_SET.has(value);
}

function parseReconfirmPurpose(value: string | null | undefined): ReconfirmPurpose | null {
  return isReconfirmPurpose(value) ? value : null;
}

function parseConfirmTarget(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return isValidUuid(value) ? value : null;
}

function parseHasReturned(value: string | null | undefined): boolean {
  return value === HAS_RETURNED_VALUE;
}

/** Drops action, target, and has_returned from a URL. Unknown values are stripped too. */
function stripReconfirmSearchParam(href: string): string {
  const url = new URL(href, "https://bondery.invalid");
  url.searchParams.delete(CONFIRM_ACTION_PARAM);
  url.searchParams.delete(CONFIRM_TARGET_PARAM);
  url.searchParams.delete(HAS_RETURNED_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

export type { ReconfirmPurpose };
export {
  CONFIRM_ACTION_PARAM,
  CONFIRM_TARGET_PARAM,
  HAS_RETURNED_PARAM,
  HAS_RETURNED_VALUE,
  isReconfirmPurpose,
  parseConfirmTarget,
  parseHasReturned,
  parseReconfirmPurpose,
  RECONFIRM_PURPOSES,
  stripReconfirmSearchParam,
};
