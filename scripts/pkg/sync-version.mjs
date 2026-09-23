#!/usr/bin/env node
/**
 * Propagate root package.json version to workspace packages and mobile native fields.
 * Derives MIN_EXTENSION_VERSION from the previous production git tag.
 * Regenerates env examples via env:sync (deploy pin stays last production CalVer).
 *
 *   pnpm run sync-version
 *   pnpm run sync-version -- --check   # dry-run; exit 1 on drift
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCalver, previousProductionCalver, readGitTags, toCoreCalver } from "./calver.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const checkOnly = process.argv.includes("--check");

const PACKAGE_JSON_PATHS = [
  "package.json",
  "apps/api/package.json",
  "apps/webapp/package.json",
  "apps/chrome-extension/package.json",
  "apps/website/package.json",
  "apps/mobile/package.json",
  "packages/branding/package.json",
  "packages/db/package.json",
  "packages/emails/package.json",
  "packages/helpers/package.json",
  "packages/mantine-next/package.json",
  "packages/openapi-spec/package.json",
  "packages/schemas/package.json",
  "packages/translations/package.json",
  "packages/typescript-config/package.json",
  "packages/vcard/package.json",
];

const MIN_EXTENSION_VERSION_RE = /export const MIN_EXTENSION_VERSION: string = "[^"]*";/;

function readRootVersion() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const version = pkg.version?.trim();
  if (!version) {
    console.error("Invalid root package.json version: (missing)");
    process.exit(1);
  }
  try {
    parseCalver(version);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
  return version;
}

function updatePackageJsonVersion(relPath, version) {
  const abs = join(root, relPath);
  const pkg = JSON.parse(readFileSync(abs, "utf8"));
  if (pkg.version === version) {
    return false;
  }
  if (!checkOnly) {
    pkg.version = version;
    writeFileSync(abs, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  return true;
}

function updateMobileAppConfig(nativeVersion) {
  const rel = "apps/mobile/app.config.ts";
  const abs = join(root, rel);
  const content = readFileSync(abs, "utf8");
  const pattern = /version:\s*"[^"]*"/;
  const next = `version: "${nativeVersion}"`;
  if (!pattern.test(content)) {
    throw new Error(`Could not find expo version in ${rel}`);
  }
  const updated = content.replace(pattern, next);
  if (updated === content) {
    return false;
  }
  if (!checkOnly) {
    writeFileSync(abs, updated);
  }
  return true;
}

function updateAndroidVersionName(nativeVersion) {
  const rel = "apps/mobile/android/app/build.gradle";
  const abs = join(root, rel);
  const content = readFileSync(abs, "utf8");
  const pattern = /versionName\s+"[^"]*"/;
  const next = `versionName "${nativeVersion}"`;
  if (!pattern.test(content)) {
    throw new Error(`Could not find versionName in ${rel}`);
  }
  const updated = content.replace(pattern, next);
  if (updated === content) {
    return false;
  }
  if (!checkOnly) {
    writeFileSync(abs, updated);
  }
  return true;
}

function updateMinExtensionVersion(minVersion) {
  const rel = "packages/helpers/src/globals/paths.ts";
  const abs = join(root, rel);
  const content = readFileSync(abs, "utf8");
  if (!MIN_EXTENSION_VERSION_RE.test(content)) {
    throw new Error(`Could not find MIN_EXTENSION_VERSION in ${rel}`);
  }
  const next = `export const MIN_EXTENSION_VERSION: string = "${minVersion}";`;
  const updated = content.replace(MIN_EXTENSION_VERSION_RE, next);
  if (updated === content) {
    return false;
  }
  if (!checkOnly) {
    writeFileSync(abs, updated);
  }
  return true;
}

function main() {
  const version = readRootVersion();
  const nativeVersion = toCoreCalver(version);
  const minVersion = previousProductionCalver(readGitTags(root), version);
  const changes = [];

  for (const rel of PACKAGE_JSON_PATHS) {
    if (updatePackageJsonVersion(rel, version)) {
      changes.push(rel);
    }
  }
  if (updateMobileAppConfig(nativeVersion)) {
    changes.push("apps/mobile/app.config.ts");
  }
  if (updateAndroidVersionName(nativeVersion)) {
    changes.push("apps/mobile/android/app/build.gradle");
  }
  if (updateMinExtensionVersion(minVersion)) {
    changes.push("packages/helpers/src/globals/paths.ts");
  }

  if (checkOnly) {
    if (changes.length > 0) {
      console.error("Version drift detected (run pnpm run sync-version):");
      for (const path of changes) {
        console.error(`  - ${path}`);
      }
      process.exit(1);
    }
    console.log(
      `All version targets match root ${version} (MIN ${minVersion}, native ${nativeVersion})`,
    );
    return;
  }

  if (changes.length > 0) {
    console.log(`Synced version ${version} (MIN ${minVersion}, native ${nativeVersion}) to:`);
    for (const path of changes) {
      console.log(`  - ${path}`);
    }
    execSync("pnpm run env:sync", { cwd: root, stdio: "inherit" });
  } else {
    console.log(`Version ${version} already synced across targets (MIN ${minVersion})`);
  }
}

main();
