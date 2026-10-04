import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { parseApiJsonResponse } from "@/lib/api/parseResponse";
import { getWebappRuntimeConfigSync } from "@/lib/platform/runtimeConfig.client";

/** POST /me/step-up on the API origin with the Better Auth cookie. Never BFF. */
export async function mintStepUpNonce(): Promise<string> {
  const config = getWebappRuntimeConfigSync();
  const apiBaseUrl = config.apiBaseUrl.replace(/\/+$/, "");
  const response = await fetch(`${apiBaseUrl}${API_ROUTES.ME_STEP_UP}`, {
    credentials: "include",
    method: "POST",
  });
  const body = await parseApiJsonResponse<{ token: string }>(response);
  if (typeof body.token !== "string" || body.token.length === 0) {
    throw new Error("Step-up token missing");
  }
  return body.token;
}
