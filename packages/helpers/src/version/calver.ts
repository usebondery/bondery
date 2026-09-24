/**
 * Bondery product versions: production CalVer `X.Y.Z` and named RCs `X.Y.Z-rc.N` (N >= 1).
 *
 * Chrome `manifest.version` is integers only, so RC `1.9.1-rc.1` maps to `1.9.1.1`.
 * `rc.0` is forbidden because Chrome treats `1.9.1.0` as `1.9.1`.
 *
 * This module is the single parser. Node scripts import it via `scripts/pkg/calver.mjs`
 * (type-stripped `.ts`); they must not copy these regexes.
 */

export type CalverVersion = {
  major: number;
  minor: number;
  patch: number;
  /** `null` = production; integer >= 1 = RC / Chrome 4th segment. */
  rc: number | null;
};

const CALVER_RE = /^(?:v)?(\d+)\.(\d+)\.(\d+)(?:-rc\.([1-9]\d*))?$/;
const CHROME_FOUR_PART_RE = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;

function toInt(value: string): number {
  return Number.parseInt(value, 10);
}

function asVersion(input: string | CalverVersion): CalverVersion {
  return typeof input === "string" ? parseCalver(input) : input;
}

/**
 * Parse npm / git identity: `1.9.1`, `v1.9.1`, `1.9.1-rc.1`, `v1.9.1-rc.1`.
 * Rejects Chrome 4-part, `rc.0`, and `1.9.1.rc-1`.
 */
export function parseCalver(input: string): CalverVersion {
  const trimmed = input.trim();
  const match = CALVER_RE.exec(trimmed);
  if (!match) {
    throw new Error(
      `Invalid CalVer/RC version "${input}". Expected X.Y.Z or X.Y.Z-rc.N (N >= 1), not rc.0 or X.Y.Z.rc-N.`,
    );
  }
  return {
    major: toInt(match[1] ?? "0"),
    minor: toInt(match[2] ?? "0"),
    patch: toInt(match[3] ?? "0"),
    rc: match[4] === undefined ? null : toInt(match[4]),
  };
}

/** Production `X.Y.Z` or RC `X.Y.Z-rc.N` for package.json / health. */
export function toNpm(input: string | CalverVersion): string {
  const version = asVersion(input);
  const core = toCoreCalver(version);
  return version.rc === null ? core : `${core}-rc.${version.rc}`;
}

/** GHCR tag — same spelling as npm (no `v` prefix). */
export function toDockerTag(input: string | CalverVersion): string {
  return toNpm(input);
}

/** Git tag: `v1.9.1` or `v1.9.1-rc.1`. */
export function toGitTag(input: string | CalverVersion): string {
  return `v${toNpm(input)}`;
}

/** Chrome `manifest.version`: production `1.9.1`, RC `1.9.1.N`. */
export function toChromeVersion(input: string | CalverVersion): string {
  const version = asVersion(input);
  const core = toCoreCalver(version);
  return version.rc === null ? core : `${core}.${version.rc}`;
}

/** 3-part CalVer without prerelease (`1.9.1` from `1.9.1-rc.2`). */
export function toCoreCalver(input: string | CalverVersion): string {
  const version = asVersion(input);
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function isProductionCalver(input: string | CalverVersion): boolean {
  return asVersion(input).rc === null;
}

export function isRc(input: string | CalverVersion): boolean {
  return asVersion(input).rc !== null;
}

/**
 * Parse a version for ordering: CalVer, SemVer RC, or Chrome 4-part.
 * `1.9.1.0` is treated as production `1.9.1`. Returns `null` if unparseable.
 */
export function parseComparableVersion(input: string): CalverVersion | null {
  const trimmed = input.trim();
  try {
    return parseCalver(trimmed);
  } catch {
    // Production parse rejects 4-part on purpose; comparison still accepts it.
  }
  const chrome = CHROME_FOUR_PART_RE.exec(trimmed);
  if (!chrome) {
    return null;
  }
  const fourth = toInt(chrome[4] ?? "0");
  return {
    major: toInt(chrome[1] ?? "0"),
    minor: toInt(chrome[2] ?? "0"),
    patch: toInt(chrome[3] ?? "0"),
    rc: fourth === 0 ? null : fourth,
  };
}

function compareParsed(a: CalverVersion, b: CalverVersion): -1 | 0 | 1 {
  if (a.major !== b.major) {
    return a.major < b.major ? -1 : 1;
  }
  if (a.minor !== b.minor) {
    return a.minor < b.minor ? -1 : 1;
  }
  if (a.patch !== b.patch) {
    return a.patch < b.patch ? -1 : 1;
  }
  if (a.rc === b.rc) {
    return 0;
  }
  if (a.rc === null) {
    return 1;
  }
  if (b.rc === null) {
    return -1;
  }
  return a.rc < b.rc ? -1 : 1;
}

/**
 * Compare CalVer, `X.Y.Z-rc.N`, and Chrome 4-part.
 * Unparseable `a` sorts below a valid `b` (426-safe); unparseable `b` does not
 * make a valid current version look outdated.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const parsedA = parseComparableVersion(a);
  const parsedB = parseComparableVersion(b);
  if (!parsedA && !parsedB) {
    return 0;
  }
  if (!parsedA) {
    return -1;
  }
  if (!parsedB) {
    return 1;
  }
  return compareParsed(parsedA, parsedB);
}

export function isVersionBelow(current: string, minimum: string): boolean {
  return compareVersions(current, minimum) < 0;
}

/**
 * Latest production tag strictly before the CalVer being shipped.
 * `shippedNpmVersion` may be `1.9.1` or `1.9.1-rc.1`; never strip `-rc` to
 * *become* MIN — exclusion is only so `v1.9.1` is not chosen while cutting it.
 */
export function previousProductionCalver(
  gitTags: readonly string[],
  shippedNpmVersion: string,
): string {
  const shippedCore = toCoreCalver(shippedNpmVersion);
  const candidates: string[] = [];
  for (const tag of gitTags) {
    const match = /^v(\d+\.\d+\.\d+)$/.exec(tag.trim());
    if (!match) {
      continue;
    }
    const core = match[1] ?? "";
    if (core === shippedCore) {
      continue;
    }
    candidates.push(core);
  }
  if (candidates.length === 0) {
    throw new Error(
      `No previous production git tag found (need vX.Y.Z excluding v${shippedCore}). Run: git fetch --tags`,
    );
  }
  candidates.sort((left, right) => compareParsed(parseCalver(right), parseCalver(left)));
  return candidates[0] ?? shippedCore;
}

/** Self-host / `.env.example` pin: production CalVer, never an RC string. */
export function infraPinCalver(packageVersion: string, gitTags: readonly string[]): string {
  const parsed = parseCalver(packageVersion);
  if (parsed.rc === null) {
    return toNpm(parsed);
  }
  return previousProductionCalver(gitTags, packageVersion);
}

/** Banner `latestVersion`: current production CalVer, or previous prod while on RC. */
export function latestProductionCalver(packageVersion: string, previousProduction: string): string {
  return isProductionCalver(packageVersion) ? toNpm(packageVersion) : previousProduction;
}

/**
 * Highest named RC (`X.Y.Z-rc.N`) for a production CalVer, by integer N
 * (`rc.10` beats `rc.9`). `coreCalver` may be `1.9.2` or `1.9.2-rc.1`.
 */
export function highestNamedRc(gitTags: readonly string[], coreCalver: string): string {
  const core = toCoreCalver(coreCalver);
  const rcs: CalverVersion[] = [];
  for (const tag of gitTags) {
    try {
      const parsed = parseCalver(tag.trim());
      if (parsed.rc === null) {
        continue;
      }
      if (toCoreCalver(parsed) !== core) {
        continue;
      }
      rcs.push(parsed);
    } catch {
      // Ignore non-CalVer tags (`ext-1.9.0`, leftover `api-X.Y.Z`).
    }
  }
  if (rcs.length === 0) {
    throw new Error(
      `No named RC git tag found for ${core} (need v${core}-rc.N). Cut and tag an RC before production.`,
    );
  }
  rcs.sort((left, right) => compareParsed(right, left));
  const winner = rcs[0];
  if (!winner) {
    throw new Error(`No named RC git tag found for ${core} (need v${core}-rc.N).`);
  }
  return toNpm(winner);
}

/**
 * Prefer a production CalVer pin (compose `BONDERY_INFRA_VERSION=X.Y.Z`) over
 * in-image `package.json`. RC pins, `beta`, and garbage never reach `parseCalver`
 * callers that throw — they keep `packageVersion`.
 */
export function overlayProductionCalver(
  packageVersion: string,
  infraVersion: string | undefined,
): string {
  const pin = infraVersion?.trim();
  if (!pin) {
    return packageVersion;
  }
  try {
    if (isProductionCalver(pin)) {
      return toNpm(pin);
    }
  } catch {
    // `beta`, `latest`, or other non-CalVer pins.
  }
  return packageVersion;
}
