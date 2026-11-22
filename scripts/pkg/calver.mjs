/**
 * Node entry for the CalVer parser. Implementation lives in
 * `packages/helpers/src/version/calver.ts` (Node type stripping; no helpers dist).
 */
import { execSync } from "node:child_process";

const PATTERN_5C723F5C6E_RE = /\r?\n/;

export {
  compareVersions,
  highestNamedRc,
  infraPinCalver,
  isProductionCalver,
  isRc,
  isVersionBelow,
  latestProductionCalver,
  overlayProductionCalver,
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
      .split(PATTERN_5C723F5C6E_RE)
      .map((tag) => tag.trim())
      .filter(Boolean);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list git tags: ${message}. Run: git fetch --tags`, { cause: error });
  }
}
