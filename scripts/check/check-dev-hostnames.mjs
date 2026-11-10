/**
 * Fail when the dev hostnames drift across their sources.
 *
 * `DEV_URLS` in `@bondery/schemas/constants/dev-ports` is the only declared
 * source of dev hostnames. These places must agree with it:
 *
 * 1. `scripts/dev/portless-alias.mjs` alias targets.
 * 2. `allowedDevOrigins` in each Next.js app, or the dev server rejects the
 *    proxied `Host` header.
 * 3. Any `.env*.example` file that still names a `*.usebondery.test` URL.
 *
 * A stale copy costs hours: the hosts file, the proxy, and Next.js each fail
 * differently for the same typo.
 *
 * Usage: node scripts/check/check-dev-hostnames.mjs
 *        (pnpm run check:dev-hostnames)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "./check-report.mjs";

const check = createCheck("check-dev-hostnames");

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");

/** Every hostname the dev stack may serve. */
const EXPECTED_HOSTS = [
  "usebondery.test",
  "app.usebondery.test",
  "api.usebondery.test",
  "mail.usebondery.test",
];

function repoPath(filePath) {
  return relative(ROOT, filePath).split(sep).join("/");
}

function read(filePath) {
  return readFileSync(filePath, "utf8");
}

/**
 * `DEV_URLS` is the declared source. Read its hostnames and confirm the alias
 * script consumes them, then compare against the expected list.
 */
function checkDevUrls() {
  const filePath = join(ROOT, "packages/schemas/src/constants/dev-ports.ts");
  const source = read(filePath);
  const declared = [...source.matchAll(/"https:\/\/([a-z0-9.-]*usebondery\.test)"/gi)].map(
    (match) => match[1],
  );
  for (const hostname of declared) {
    if (!EXPECTED_HOSTS.includes(hostname)) {
      check.add(
        `${repoPath(filePath)} declares ${hostname}, which check-dev-hostnames does not expect. Update EXPECTED_HOSTS.`,
      );
    }
  }
  for (const hostname of EXPECTED_HOSTS) {
    if (!declared.includes(hostname)) {
      check.add(`${repoPath(filePath)} no longer declares ${hostname} in DEV_URLS.`);
    }
  }
}

/**
 * A `allowedDevOrigins` entry matches a hostname when equal, when it is a
 * `*.parent` wildcard covering a subdomain, or when it is the bare parent of a
 * wildcard the host matches.
 *
 * @param {string[]} entries
 * @param {string} hostname
 */
function allowsHost(entries, hostname) {
  return entries.some((entry) => {
    if (entry === hostname) {
      return true;
    }
    if (entry.startsWith("*.")) {
      const parent = entry.slice(2);
      return hostname === parent || hostname.endsWith(`.${parent}`);
    }
    return false;
  });
}

/**
 * Each Next.js app that the proxy serves must allow the dev hostnames.
 */
function checkAllowedDevOrigins() {
  const apps = ["website", "webapp"];
  for (const app of apps) {
    const filePath = join(ROOT, "apps", app, "next.config.ts");
    let source;
    try {
      source = read(filePath);
    } catch {
      check.add(`apps/${app}/next.config.ts is missing.`);
      continue;
    }
    const match = source.match(/allowedDevOrigins:\s*\[([\s\S]*?)\]/);
    if (!match) {
      check.add(`${repoPath(filePath)} has no allowedDevOrigins; proxied dev hosts are rejected.`);
      continue;
    }
    const entries = [...(match[1] ?? "").matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
    for (const hostname of EXPECTED_HOSTS) {
      // Mailpit is served by Docker, not by either Next.js app.
      if (hostname.startsWith("mail.")) {
        continue;
      }
      if (!allowsHost(entries, hostname)) {
        check.add(`${repoPath(filePath)} does not allow ${hostname} in allowedDevOrigins.`);
      }
    }
  }
}

/**
 * The alias script must build names and ports from the shared constants.
 */
function checkAliasScript() {
  const filePath = join(ROOT, "scripts/dev/portless-alias.mjs");
  const source = read(filePath);
  if (!source.includes("DEV_URLS")) {
    check.add(`${repoPath(filePath)} no longer derives hostnames from DEV_URLS.`);
  }
  if (!source.includes("DEV_PORTS")) {
    check.add(`${repoPath(filePath)} no longer derives ports from DEV_PORTS.`);
  }
}

/**
 * Env examples must not name a dev hostname that no longer exists.
 */
function checkEnvExamples() {
  const seen = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".git" || entry === ".temp") {
        continue;
      }
      const fullPath = join(dir, entry);
      let info;
      try {
        info = statSync(fullPath);
      } catch {
        continue;
      }
      if (info.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!/\.env.*\.example$/.test(entry)) {
        continue;
      }
      const source = read(fullPath);
      for (const match of source.matchAll(/https?:\/\/[a-z0-9.-]*usebondery\.test/gi)) {
        const hostname = new URL(match[0]).hostname;
        if (!EXPECTED_HOSTS.includes(hostname) && !seen.has(`${repoPath(fullPath)}:${hostname}`)) {
          seen.add(`${repoPath(fullPath)}:${hostname}`);
          check.add(`${repoPath(fullPath)} names ${hostname}, which is not a registered dev host.`);
        }
      }
    }
  };
  walk(ROOT);
}

checkDevUrls();
checkAliasScript();
checkAllowedDevOrigins();
checkEnvExamples();
check.ok();
