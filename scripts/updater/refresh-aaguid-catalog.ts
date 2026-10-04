/**
 * Fetch the community AAGUID catalog and copy Better Auth authenticator names.
 * Run via: pnpm run update:aaguid-catalog
 *
 * Empty `{}` from the community vendor is a retirement alarm: abort that write
 * so the last good snapshot stays on disk. The Better Auth map is copied from
 * the installed `@better-auth/passkey` package (not GitHub).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  isPlainObject,
  sanitizeAaguidCatalogDocument,
  sanitizeBetterAuthAuthenticatorNames,
  shouldAbortAaguidCatalogRefresh,
} from "../../apps/webapp/src/lib/auth/aaguid-catalog";

const AAGUID_CATALOG_URL =
  "https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/main/aaguid.json";
const GITHUB_CONTENTS_URL =
  "https://api.github.com/repos/passkeydeveloper/passkey-authenticator-aaguids/contents/aaguid.json";
const USER_AGENT = "bondery-aaguid-catalog-refresh";
const MAX_ATTEMPTS = 3;

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const catalogDir = join(repoRoot, "apps/webapp/src/lib/auth/aaguid-catalog");
const catalogPath = join(catalogDir, "aaguid.json");
const betterAuthNamesPath = join(catalogDir, "better-auth-authenticator-names.json");
const sourcePath = join(catalogDir, "source.json");
const webappRequire = createRequire(join(repoRoot, "apps/webapp/package.json"));

async function loadBetterAuthAuthenticatorNames(): Promise<unknown> {
  const { commonAuthenticatorNames } = (await import(
    pathToFileURL(webappRequire.resolve("@better-auth/passkey")).href
  )) as { commonAuthenticatorNames: unknown };
  return commonAuthenticatorNames;
}

function stringifySortedRecord(record: Record<string, unknown>): string {
  const sorted = Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

function readBetterAuthPasskeyVersion(): string {
  const entry = webappRequire.resolve("@better-auth/passkey");
  const pkgPath = join(dirname(entry), "..", "package.json");
  const pkg: unknown = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (isPlainObject(pkg) && typeof pkg.version === "string" && pkg.version.length > 0) {
    return pkg.version;
  }
  throw new Error(`Could not read version from ${pkgPath}`);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchText(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          accept: "application/json",
          "user-agent": USER_AGENT,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      console.warn(`Fetch attempt ${attempt}/${MAX_ATTEMPTS} failed: ${String(error)}`);
      if (attempt < MAX_ATTEMPTS) {
        await sleep(500 * 2 ** (attempt - 1));
      }
    }
  }
  throw lastError;
}

async function fetchGitSha(): Promise<string | undefined> {
  try {
    const raw = await fetchText(GITHUB_CONTENTS_URL);
    const payload: unknown = JSON.parse(raw);
    if (
      typeof payload === "object" &&
      payload !== null &&
      "sha" in payload &&
      typeof payload.sha === "string" &&
      payload.sha.length > 0
    ) {
      return payload.sha;
    }
  } catch (error) {
    console.warn(`Could not read GitHub blob SHA: ${String(error)}`);
  }
  return undefined;
}

async function writeBetterAuthAuthenticatorNames(): Promise<{
  entryCount: number;
  version: string;
}> {
  const names = sanitizeBetterAuthAuthenticatorNames(await loadBetterAuthAuthenticatorNames());
  const entryCount = Object.keys(names).length;
  if (entryCount === 0) {
    throw new Error(
      "Better Auth authenticator names sanitized to zero entries. Aborting that write.",
    );
  }
  const version = readBetterAuthPasskeyVersion();
  await mkdir(catalogDir, { recursive: true });
  await writeFile(betterAuthNamesPath, stringifySortedRecord(names), "utf8");
  console.log(
    `Wrote ${entryCount} Better Auth authenticator names (${version}) to ${betterAuthNamesPath}`,
  );
  return { entryCount, version };
}

async function writeCommunityCatalog(): Promise<{
  entryCount: number;
  fetchedAt: string;
  gitSha?: string;
  sha256: string;
  url: string;
} | null> {
  const body = await fetchText(AAGUID_CATALOG_URL);
  const doc: unknown = JSON.parse(body);
  if (shouldAbortAaguidCatalogRefresh(doc)) {
    console.error(
      "AAGUID catalog is empty or not an object. Aborting community write (last good snapshot kept).",
    );
    return null;
  }

  const catalog = sanitizeAaguidCatalogDocument(doc);
  const entryCount = Object.keys(catalog).length;
  if (entryCount === 0) {
    console.error("AAGUID catalog sanitized to zero entries. Aborting community write.");
    return null;
  }

  const sha256 = createHash("sha256").update(body).digest("hex");
  const gitSha = await fetchGitSha();
  const fetchedAt = new Date().toISOString();
  await mkdir(catalogDir, { recursive: true });
  await writeFile(catalogPath, `${JSON.stringify(catalog)}\n`, "utf8");
  console.log(`Wrote ${entryCount} AAGUID entries to ${catalogPath}`);
  return gitSha
    ? { entryCount, fetchedAt, gitSha, sha256, url: AAGUID_CATALOG_URL }
    : { entryCount, fetchedAt, sha256, url: AAGUID_CATALOG_URL };
}

async function main(): Promise<void> {
  const betterAuth = await writeBetterAuthAuthenticatorNames();
  const community = await writeCommunityCatalog();
  if (!community) {
    process.exitCode = 1;
    return;
  }

  const source = {
    ...community,
    betterAuth: {
      entryCount: betterAuth.entryCount,
      package: "@better-auth/passkey",
      version: betterAuth.version,
    },
  };
  await writeFile(sourcePath, stringifySortedRecord(source), "utf8");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
