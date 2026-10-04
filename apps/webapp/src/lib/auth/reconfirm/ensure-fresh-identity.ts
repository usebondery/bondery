"use client";

import { isBetterAuthSessionFresh } from "./ba-matches-bff";
import { buildReconfirmCallbackUrl } from "./callback-urls";
import type { ReconfirmPurpose } from "./purposes";

export type EnsureFreshIdentityResult = "fresh" | "cancelled";

/**
 * Confirms the Better Auth cookie is fresh. When a step-up is required,
 * navigates to `/confirm` without reminting the BFF session. Callers must
 * not continue when the result is `cancelled`.
 */
export async function ensureFreshIdentity(options: {
  purpose: ReconfirmPurpose;
  targetId?: string;
}): Promise<EnsureFreshIdentityResult> {
  const forceReconfirm = options.purpose === "delete_account";
  if (!forceReconfirm && (await isBetterAuthSessionFresh())) {
    return "fresh";
  }

  window.location.assign(
    buildReconfirmCallbackUrl(window.location.origin, options.purpose, options.targetId),
  );
  return "cancelled";
}
