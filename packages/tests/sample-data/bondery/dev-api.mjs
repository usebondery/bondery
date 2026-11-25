/**
 * The API base URL for the sample-data scripts.
 *
 * The local API serves HTTPS only, on 127.0.0.1:26631, with a certificate from the private dev
 * API CA (`pnpm run api:secrets`). For that URL, the CA joins the certificates `fetch()` trusts,
 * as it does in the webapp's server side. Another BONDERY_API_URL is used as it is.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getCACertificates, setDefaultCACertificates } from "node:tls";
import { fileURLToPath } from "node:url";

const PATTERN_5C2F2B24_RE = /\/+$/u;

const LOCAL_API_URL = "https://127.0.0.1:26631";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const DEV_API_CA = path.join(ROOT, ".temp/api-secrets/client/ca.crt");

export function resolveDevApiUrl() {
  const url = (process.env.BONDERY_API_URL ?? LOCAL_API_URL).replace(PATTERN_5C2F2B24_RE, "");
  if (url !== LOCAL_API_URL) {
    return url;
  }
  if (!existsSync(DEV_API_CA)) {
    throw new Error(`No dev API CA at ${DEV_API_CA}. Run: pnpm run api:secrets`);
  }
  setDefaultCACertificates([...getCACertificates("default"), readFileSync(DEV_API_CA, "utf8")]);
  return url;
}
