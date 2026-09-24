#!/usr/bin/env node
/**
 * Resolve the highest named RC git tag for a production CalVer (integer N).
 * Writes GitHub Actions outputs when GITHUB_OUTPUT is set.
 *
 * Usage: CORE_CALVER=1.9.2 node .github/scripts/resolve-highest-rc.mjs
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { highestNamedRc, readGitTags, toGitTag } from "../../scripts/pkg/calver.mjs";

// biome-ignore lint/suspicious/noUndeclaredEnvVars: GitHub Actions / operator env
const core = (process.env.CORE_CALVER ?? "").trim();
if (!core) {
  console.error("CORE_CALVER is required (production X.Y.Z)");
  process.exit(1);
}

const repoRoot = process.cwd();
let rcVersion;
try {
  rcVersion = highestNamedRc(readGitTags(repoRoot), core);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}

const rcGitTag = toGitTag(rcVersion);
let rcGitSha;
try {
  rcGitSha = execFileSync("git", ["rev-parse", `${rcGitTag}^{}`], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to peel ${rcGitTag} to a commit: ${message}`);
  process.exit(1);
}

const rcGitShaShort = rcGitSha.slice(0, 7);
const lines = [
  `rc_version=${rcVersion}`,
  `rc_git_tag=${rcGitTag}`,
  `rc_git_sha=${rcGitSha}`,
  `rc_git_sha_short=${rcGitShaShort}`,
];

// biome-ignore lint/suspicious/noUndeclaredEnvVars: GitHub Actions runner output file
const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(githubOutput, `${lines.join("\n")}\n`);
}

for (const line of lines) {
  console.log(line);
}
