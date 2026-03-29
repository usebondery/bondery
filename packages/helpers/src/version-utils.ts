/**
 * Compares two version strings in MAJOR.MINOR.PATCH format.
 *
 * @param a - First version string (e.g. "1.3.0")
 * @param b - Second version string (e.g. "1.4.0")
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i++) {
    const segA = partsA[i] ?? 0;
    const segB = partsB[i] ?? 0;
    if (segA < segB) return -1;
    if (segA > segB) return 1;
  }

  return 0;
}

/**
 * Checks whether a version is below a required minimum.
 *
 * @param current - The current version string (e.g. "1.3.0")
 * @param minimum - The minimum required version string (e.g. "1.4.0")
 * @returns true if current is strictly below minimum
 */
export function isVersionBelow(current: string, minimum: string): boolean {
  return compareVersions(current, minimum) < 0;
}
