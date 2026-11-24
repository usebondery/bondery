import { SUPPORT_EMAIL, WEBSITE_ROUTES } from "#globals/paths.js";

/** RFC 9116 recommends Expires no more than one year out; 364 days stays under that. */
const PATTERN_5C2F2B24_RE = /\/+$/;

const SECURITY_TXT_MAX_AGE_MS = 364 * 24 * 60 * 60 * 1000;

export function buildSecurityTxt({
  disclosureOrigin,
  now,
}: {
  disclosureOrigin: string;
  now: Date;
}): string {
  const origin = disclosureOrigin.replace(PATTERN_5C2F2B24_RE, "");
  const expires = new Date(now.getTime() + SECURITY_TXT_MAX_AGE_MS).toISOString();

  return `${[
    `Contact: mailto:${SUPPORT_EMAIL}`,
    `Expires: ${expires}`,
    `Encryption: ${origin}/.well-known/pgp-key.txt`,
    `Acknowledgments: ${origin}${WEBSITE_ROUTES.SECURITY}`,
    `Preferred-Languages: en`,
    `Canonical: ${origin}/.well-known/security.txt`,
    `Policy: ${origin}${WEBSITE_ROUTES.SECURITY}`,
  ].join("\n")}\n`;
}
