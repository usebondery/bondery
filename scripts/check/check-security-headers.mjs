/**
 * Fail CI when a Next.js proxy stops sending the security headers correctly.
 *
 * Three bugs are possible and none of them produce a visible error:
 *
 * 1. The wrong config export name. Next.js reads `export const config`. A file
 *    that exports `proxyConfig` looks correct and runs on every path, including
 *    `_next/static`, with no matcher applied.
 * 2. A hand-written policy. A local string drifts from the shared builder, so
 *    one app silently allows a source the other blocks.
 * 3. `script-src` with `'unsafe-inline'`. That value disables the nonce and
 *    allows any inline script, which is the exact risk the policy exists to
 *    stop.
 *
 * The check reads the source of each `apps/*\/src/proxy.ts` and the CSP module
 * it delegates to, builds nothing, and needs no browser.
 *
 * Usage: node scripts/check/check-security-headers.mjs
 *        (pnpm run check:security-headers)
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "./check-report.mjs";

const check = createCheck("check-security-headers");

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const appsRoot = join(repoRoot, "apps");

/** The one module allowed to assemble a policy string. */
const SHARED_BUILDER_EXPORT = "buildCsp";

/** Every app that renders HTML and therefore must send a policy. */
const EXPECTED_APPS = ["website", "webapp"];

function repoPath(filePath) {
  return relative(repoRoot, filePath).split(sep).join("/");
}

function isFile(filePath) {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/** Every `.ts` file under `dir`, recursively. */
function collectTsFiles(dir, acc = []) {
  if (!existsSync(dir)) {
    return acc;
  }
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === ".next") {
      continue;
    }
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      collectTsFiles(full, acc);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * A CSP assignment: a string literal or template literal on the right of a
 * `Content-Security-Policy` value. The builder returns one, so an assignment
 * anywhere except through the shared builder is a hand-written policy.
 */
const HAND_WRITTEN_POLICY = /["'`]\s*(?:default-src|script-src)\b/;

/** Proxy files that exist for an app. */
function proxyPath(app) {
  return join(appsRoot, app, "src", "proxy.ts");
}

const foundApps = [];

for (const app of EXPECTED_APPS) {
  const proxyFile = proxyPath(app);
  if (!isFile(proxyFile)) {
    continue;
  }
  foundApps.push(app);

  const source = readFileSync(proxyFile, "utf8");
  const at = repoPath(proxyFile);

  if (/export\s+const\s+proxyConfig\b/.test(source)) {
    check.add(
      `${at}: exports proxyConfig. Next.js reads \`export const config\`, so the matcher` +
        " is silently ignored and the proxy runs on every path.",
    );
  }

  if (!/export\s+const\s+config\b/.test(source)) {
    check.add(
      `${at}: has no \`export const config\`. Without it the proxy runs on _next/static too.`,
    );
  }

  // Directives in the proxy mean the policy was written inline.
  if (HAND_WRITTEN_POLICY.test(source)) {
    check.add(`${at}: builds a policy from literal directives. Use the shared builder instead.`);
  }

  // The proxy must reach the shared builder, directly or through a module it owns.
  const appSrc = join(appsRoot, app, "src");
  const delegates = collectTsFiles(appSrc).filter((file) => {
    const content = readFileSync(file, "utf8");
    return content.includes(SHARED_BUILDER_EXPORT);
  });

  if (delegates.length === 0) {
    check.add(
      `${at}: does not reach ${SHARED_BUILDER_EXPORT} from @bondery/helpers/security.` +
        " Every policy must come from the shared builder.",
    );
    continue;
  }

  for (const file of delegates) {
    if (!readFileSync(file, "utf8").includes("@bondery/helpers/security")) {
      check.add(
        `${repoPath(file)}: uses ${SHARED_BUILDER_EXPORT} without importing` +
          " `@bondery/helpers/security`.",
      );
    }
  }

  // An enforced script-src that allows inline script defeats the nonce.
  for (const file of delegates) {
    const content = readFileSync(file, "utf8");
    const enforcedScriptSrc = /scriptSrc\s*:\s*\[[^\]]*'unsafe-inline'/s.test(content);
    if (enforcedScriptSrc) {
      check.add(
        `${repoPath(file)}: scriptSrc allows 'unsafe-inline'. That disables the nonce and` +
          " lets any inline script run.",
      );
    }
  }
}

for (const app of EXPECTED_APPS) {
  if (!foundApps.includes(app)) {
    check.add(`apps/${app}/src/proxy.ts is missing. Every HTML app must send a policy.`);
  }
}

if (check.violations.length === 0) {
  check.ok(`${foundApps.length} proxy file(s) use the shared builder`);
} else {
  check.failIfNeeded();
}
