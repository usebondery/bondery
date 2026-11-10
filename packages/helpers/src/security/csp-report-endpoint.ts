import { API_ROUTES } from "../globals/paths.js";

/**
 * Resolves the CSP violation report endpoint from the public API URL.
 *
 * The report URL is not configuration of its own. It is always
 * `${BONDERY_PUBLIC_API_URL}${API_ROUTES.SECURITY_CSP_REPORT}`, so deriving it
 * removes a second variable that could disagree with the API the reports are
 * posted to. That class of drift is what put a `.test` host into the production
 * examples once.
 *
 * Reporting is on by default. A self-host install sets
 * `BONDERY_PUBLIC_CSP_REPORT_ENABLED=false` to send nothing.
 *
 * @param env - Process environment. Any object with the two keys works.
 * @returns Absolute report URL, or `undefined` when reporting is disabled or
 * the API URL is missing.
 */
export function resolveCspReportEndpoint(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  if (!isCspReportEnabled(env)) {
    return undefined;
  }

  const apiUrl = env.BONDERY_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    return undefined;
  }

  let origin: string;
  try {
    // `new URL` rejects a bare host and drops any trailing slash, so the
    // endpoint is absolute and joins without a double slash.
    origin = new URL(apiUrl).origin;
  } catch {
    return undefined;
  }

  return `${origin}${API_ROUTES.SECURITY_CSP_REPORT}`;
}

/**
 * `false` only when the flag is explicitly `"false"`. Every other value,
 * including unset, keeps reporting on, so a missing variable cannot silently
 * disable collection.
 */
export function isCspReportEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.BONDERY_PUBLIC_CSP_REPORT_ENABLED?.trim().toLowerCase() !== "false";
}
