import { SOCIAL_LINKS } from "@bondery/helpers";
import { compareVersions, isProductionCalver, toGitTag } from "@bondery/helpers/version";

/**
 * Production GitHub Releases that exist today. Earlier CalVer cuts were not
 * tagged. `release.yml` has tagged every production cut after 1.9.2.
 */
const HISTORICAL_GITHUB_PRODUCTION_RELEASES = new Set(["1.8.3", "1.9.0", "1.9.2"]);
const GITHUB_RELEASE_AFTER = "1.9.2";

export function changelogHasGithubRelease(version: string): boolean {
  if (!isProductionCalver(version)) {
    return false;
  }
  if (HISTORICAL_GITHUB_PRODUCTION_RELEASES.has(version)) {
    return true;
  }
  return compareVersions(version, GITHUB_RELEASE_AFTER) > 0;
}

export function changelogGithubReleaseUrl(version: string): string | null {
  if (!changelogHasGithubRelease(version)) {
    return null;
  }
  return `${SOCIAL_LINKS.github}/releases/tag/${toGitTag(version)}`;
}

export function changelogVersionHeadingId(version: string): string {
  return `v-${version.replaceAll(".", "-")}`;
}
