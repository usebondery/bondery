/**
 * Node entry for the CalVer parser. Implementation lives in
 * `packages/helpers/src/version/calver.ts` (Node type stripping; no helpers dist).
 */
import { execSync } from "node:child_process";

export {
  compareVersions,
  infraPinCalver,
  isProductionCalver,
  isRc,
  isVersionBelow,
  latestProductionCalver,
  parseCalver,
  parseComparableVersion,
  previousProductionCalver,
  toChromeVersion,
  toCoreCalver,
  toDockerTag,
  toGitTag,
  toNpm,
} from "../../packages/helpers/src/version/calver.ts";

export function readGitTags(repoRoot) {
  try {
    return execSync('git tag -l "v*"', { cwd: repoRoot, encoding: "utf8" })
      .split(/\r?\n/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list git tags: ${message}. Run: git fetch --tags`);
  }
}
