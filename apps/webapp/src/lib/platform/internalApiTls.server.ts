/**
 * Trust for the webapp's server-side calls to the API's internal HTTPS listener
 * (docs/deploy/configuration.mdx#internal-api-tls).
 *
 * Server rendering, the BFF routes, the OAuth token exchange, and the JWKS fetch all reach the
 * API through Node's TLS stack. Next.js wraps `fetch` and replaces undici dispatchers, and jose
 * brings its own fetch, so a per-request agent would miss some of them. Instead, the CA in
 * BONDERY_INFRA_INTERNAL_API_CA_FILE joins Node's default trust store once, at startup, before
 * the server takes requests. It is added to the CAs Node already trusts; nothing is replaced.
 *
 * Node-only: never import from Edge or the browser.
 */

import { readFileSync } from "node:fs";
import { getCACertificates, setDefaultCACertificates } from "node:tls";

import { WEBAPP_INTERNAL_API_URL_ENV } from "@/lib/platform/runtimeConfig.env";

const PEM_CERTIFICATE = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g;

type TrustStore = {
  getCACertificates: (type?: "default") => string[];
  setDefaultCACertificates: (certificates: string[]) => void;
};

function readCaFile(path: string, readTextFile: (filePath: string) => string): string[] {
  let contents: string;
  try {
    contents = readTextFile(path);
  } catch (error) {
    // The system error code (ENOENT, EACCES) names the problem; the error itself stays the cause.
    const code = (error as { code?: unknown } | null)?.code;
    const codeSuffix = typeof code === "string" ? `: ${code}` : "";
    throw new Error(
      `${INTERNAL_API_CA_FILE_ENV} points to a file the webapp cannot read (${path})${codeSuffix}. Local development: pnpm run api:secrets`,
      { cause: error },
    );
  }
  const certificates = contents.match(PEM_CERTIFICATE) ?? [];
  if (certificates.length === 0) {
    throw new Error(
      `${INTERNAL_API_CA_FILE_ENV} points to a file with no PEM certificate (${path})`,
    );
  }
  return certificates;
}

export const INTERNAL_API_CA_FILE_ENV = "BONDERY_INFRA_INTERNAL_API_CA_FILE";

export type InternalApiTlsOutcome = {
  /** The CA file now trusted, or null when none is configured. */
  caFile: string | null;
  /** Set when a production webapp calls the API without TLS. */
  warning: string | null;
};

/**
 * Adds the internal API CA to Node's default trust store. Throws when the CA file cannot be
 * used, or is set for a plaintext internal URL: that setup looks verified but is not.
 */
export function trustInternalApiCa(
  env: Record<string, string | undefined> = process.env,
  readTextFile: (path: string) => string = (path) => readFileSync(path, "utf8"),
  trustStore: TrustStore = { getCACertificates, setDefaultCACertificates },
): InternalApiTlsOutcome {
  const internalUrl = env[WEBAPP_INTERNAL_API_URL_ENV]?.trim() ?? "";
  const caFile = env[INTERNAL_API_CA_FILE_ENV]?.trim();
  const usesTls = internalUrl.startsWith("https://");

  if (caFile) {
    if (!usesTls) {
      throw new Error(
        `${INTERNAL_API_CA_FILE_ENV} is set, but ${WEBAPP_INTERNAL_API_URL_ENV} does not use https://`,
      );
    }
    trustStore.setDefaultCACertificates([
      ...trustStore.getCACertificates("default"),
      ...readCaFile(caFile, readTextFile),
    ]);
  }

  const warning =
    env["NODE_ENV"] === "production" && internalUrl.startsWith("http://")
      ? `${WEBAPP_INTERNAL_API_URL_ENV} uses http://, so server-side calls to the API (tokens, user data) are not encrypted. Use the API's internal HTTPS listener. See https://docs.usebondery.com/deploy/configuration#internal-api-tls`
      : null;

  return { caFile: caFile ?? null, warning };
}
