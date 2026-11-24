#!/usr/bin/env node
/**
 * CI guard: root package.json version must match all sync targets and deploy pin.
 * Plugin manifest versions are checked by check:llm-plugins, not here.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  infraPinCalver,
  isProductionCalver,
  parseCalver,
  readGitTags,
  toCoreCalver,
} from "../pkg/calver.mjs";

const VERSION_RE = /version:\s*"([^"]+)"/;
const VERSIONNAME_RE = /versionName\s+"([^"]+)"/;
const BONDERY_INFRA_VERSION_RE_2 = /^BONDERY_INFRA_VERSION=(\d+\.\d+\.\d+)/m;
const BONDERY_INFRA_VERSION_RE = /^# BONDERY_INFRA_VERSION=(\d+\.\d+\.\d+)/m;

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

  function readRootVersion() {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    return pkg.version?.trim() ?? "";
  }

  function fail(message) {
    console.error(message);
    process.exitCode = 1;
  }

  function readPackageVersion(relPath) {
    const pkg = JSON.parse(readFileSync(join(root, relPath), "utf8"));
    return pkg.version?.trim() ?? "";
  }

  function readMobileAppConfigVersion() {
    const content = readFileSync(join(root, "apps/mobile/app.config.ts"), "utf8");
    const match = content.match(VERSION_RE);
    return match?.[1] ?? "";
  }

  function readAndroidVersionName() {
    const content = readFileSync(join(root, "apps/mobile/android/app/build.gradle"), "utf8");
    const match = content.match(VERSIONNAME_RE);
    return match?.[1] ?? "";
  }

  function readServerJsonVersion() {
    const server = JSON.parse(readFileSync(join(root, "server.json"), "utf8"));
    return typeof server.version === "string" ? server.version.trim() : "";
  }

  function readDeployExampleVersion() {
    const examplePath = join(root, "deploy/bondery/.env.example");
    if (!existsSync(examplePath)) {
      return "";
    }
    const content = readFileSync(examplePath, "utf8");
    const uncommented = content.match(BONDERY_INFRA_VERSION_RE_2);
    if (uncommented) {
      return uncommented[1];
    }
    const commented = content.match(BONDERY_INFRA_VERSION_RE);
    return commented?.[1] ?? "";
  }

  function assertNoLegacyImageTagEnv() {
    const files = ["deploy/bondery/.env.example", "packages/helpers/src/env/manifest.ts"];
    for (const rel of files) {
      const content = readFileSync(join(root, rel), "utf8");
      if (
        content.includes("BONDERY_INFRA_API_IMAGE_TAG") ||
        content.includes("BONDERY_INFRA_WEBAPP_IMAGE_TAG")
      ) {
        fail(
          `Legacy image tag env still present in ${rel}. Delete BONDERY_INFRA_API_IMAGE_TAG and BONDERY_INFRA_WEBAPP_IMAGE_TAG and use BONDERY_INFRA_VERSION instead.`,
        );
      }
    }
  }

  function checkReleaseChangelog(releaseVersion) {
    const changelogPath = join(root, `docs/changelog/${releaseVersion}.mdx`);
    const metaPath = join(root, "docs/changelog/meta.json");
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: GitHub Actions PR metadata only
    const branch = process.env.GITHUB_HEAD_REF ?? "";
    const isReleaseBranch = branch.startsWith("chore/release-");

    if (!isProductionCalver(releaseVersion)) {
      return;
    }

    if (!existsSync(changelogPath)) {
      if (isReleaseBranch) {
        fail(`Release branch ${branch} requires docs/changelog/${releaseVersion}.mdx`);
      }
      return;
    }

    if (!existsSync(metaPath)) {
      if (isReleaseBranch) {
        fail(`Release branch ${branch} requires docs/changelog/meta.json`);
      }
      return;
    }

    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    const pages = meta.pages ?? [];

    if (!pages.includes(releaseVersion)) {
      fail(`docs/changelog/meta.json must list ${releaseVersion} in pages`);
    }

    if (pages[0] !== releaseVersion) {
      fail(`docs/changelog/meta.json must list ${releaseVersion} first (newest first)`);
    }
  }

  const version = readRootVersion();
  try {
    parseCalver(version);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(message);
  }

  const nativeVersion = toCoreCalver(version);
  const expectedInfraPin = infraPinCalver(version, readGitTags(root));
  const errors = [];

  const packagePaths = [
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

  for (const rel of packagePaths) {
    const v = readPackageVersion(rel);
    if (v !== version) {
      errors.push(`${rel}: ${v} (expected ${version})`);
    }
  }

  if (readMobileAppConfigVersion() !== nativeVersion) {
    errors.push(
      `apps/mobile/app.config.ts: ${readMobileAppConfigVersion()} (expected native ${nativeVersion})`,
    );
  }
  if (readAndroidVersionName() !== nativeVersion) {
    errors.push(
      `apps/mobile/android/app/build.gradle versionName: ${readAndroidVersionName()} (expected native ${nativeVersion})`,
    );
  }
  if (readServerJsonVersion() !== version) {
    errors.push(`server.json: ${readServerJsonVersion()} (expected ${version})`);
  }

  const deployExampleVersion = readDeployExampleVersion();
  if (deployExampleVersion && deployExampleVersion !== expectedInfraPin) {
    errors.push(
      `deploy/bondery/.env.example pin: ${deployExampleVersion} (expected last production ${expectedInfraPin})`,
    );
  }

  assertNoLegacyImageTagEnv();

  try {
    execSync("node scripts/pkg/sync-version.mjs --check", { cwd: root, stdio: "pipe" });
  } catch {
    errors.push("sync-version --check failed (see sync-version output)");
  }

  checkReleaseChangelog(version);

  if (errors.length > 0) {
    console.error(`Version mismatch against root ${version}:`);
    for (const line of errors) {
      console.error(`  - ${line}`);
    }
    console.error("Run: pnpm run sync-version");
    process.exitCode = 1;
    return;
  }

  console.log(`Version check passed (${version}, infra pin ${expectedInfraPin})`);
}

main();
