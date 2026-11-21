/**
 * Shared success/failure reporting for monorepo CI check scripts.
 *
 * @param {string} name npm script name (with or without `check-` prefix)
 */
export function createCheck(name) {
  const label = name.startsWith("check-") ? name : `check-${name}`;

  /** @type {string[]} */
  const violations = [];

  function failIfNeeded() {
    if (violations.length === 0) {
      return;
    }
    console.error(`${label}: failed\n`);
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    process.exitCode = 1;
    throw new Error(`${label}: failed`);
  }

  return {
    add(message) {
      violations.push(message);
    },
    failIfNeeded,
    ok(detail) {
      failIfNeeded();
      const suffix = detail ? ` (${detail})` : "";
      console.log(`${label}: ok${suffix}`);
    },
    get violations() {
      return violations;
    },
  };
}
