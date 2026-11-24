/** True when running API unit tests or CI (`NODE_ENV=test`). */
export function isTestEnvironment(): boolean {
  return process.env["NODE_ENV"] === "test";
}

/**
 * Skip live dependency probes at boot and in `/health/ready` (CI unit tests without real infra).
 * All runtime `init*` / `verify*` modules use this — do not branch on `NODE_ENV` directly.
 */
export function shouldSkipLiveRuntimeVerify(): boolean {
  return isTestEnvironment();
}

/**
 * When a required runtime dependency is missing: throw in dev/prod, no-op in test
 * (caller returns unconfigured readiness).
 */
export function assertRuntimeDependencyConfigured(configured: boolean, message: string): void {
  if (!configured && !shouldSkipLiveRuntimeVerify()) {
    throw new Error(message);
  }
}
