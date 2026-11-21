/**
 * Expiry warnings for the TLS certificates of the services the API depends on (Postgres, object
 * storage). The windows match the stack-secrets job, which renews a bundled certificate on the
 * first deploy within 90 days of its expiry.
 */

import type { FastifyBaseLogger } from "fastify";

export const CERTIFICATE_WARN_DAYS = 90;
export const CERTIFICATE_ERROR_DAYS = 14;

/**
 * Logs `message` as a warning below 90 days left and as an error below 14 days. Returns the
 * level used, or null when the certificate is not close to expiry or its expiry is unknown.
 */
export function logExpiringCertificate(
  log: Pick<FastifyBaseLogger, "error" | "warn">,
  daysLeft: number | null,
  message: string,
): "error" | "warn" | null {
  if (daysLeft === null || daysLeft >= CERTIFICATE_WARN_DAYS) {
    return null;
  }
  if (daysLeft < CERTIFICATE_ERROR_DAYS) {
    log.error({ certificateDaysLeft: daysLeft }, message);
    return "error";
  }
  log.warn({ certificateDaysLeft: daysLeft }, message);
  return "warn";
}
