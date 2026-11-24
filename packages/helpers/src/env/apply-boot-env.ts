import {
  ENV_MANIFEST,
  type EnvEnvironment,
  type EnvVarDef,
  resolveExampleValue,
  type TargetId,
} from "#env/manifest.js";

/** Resolve boot env value for a manifest entry (development profile). */
export function resolveBootEnvValue(entry: EnvVarDef): string {
  return entry.boot?.value ?? resolveExampleValue(entry, "development");
}

/** Runtime env names applied by `applyTargetBootEnv` for a target and environment. */
export function getBootEnvVarNames(targetId: TargetId, environment: EnvEnvironment): string[] {
  const names = new Set<string>();
  for (const entry of ENV_MANIFEST) {
    const target = entry.targets.find((t) => t.id === targetId);
    if (!target) {
      continue;
    }
    if (!entry.requiredIn.includes(environment) && entry.boot?.include !== true) {
      continue;
    }
    names.add(target.runtimeName ?? entry.canonical);
  }
  return [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Names included only via `boot.include` (not manifest-required for the environment). */
export function getBootIncludeExtraVarNames(
  targetId: TargetId,
  environment: EnvEnvironment,
): string[] {
  const names: string[] = [];
  for (const entry of ENV_MANIFEST) {
    if (!entry.boot?.include) {
      continue;
    }
    const target = entry.targets.find((t) => t.id === targetId);
    if (!target) {
      continue;
    }
    if (entry.requiredIn.includes(environment)) {
      continue;
    }
    names.push(target.runtimeName ?? entry.canonical);
  }
  return names.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Apply manifest boot profile so a target can start without a `.env` file. */
export function applyTargetBootEnv(
  targetId: TargetId,
  environment: EnvEnvironment,
  env: NodeJS.ProcessEnv = process.env,
): void {
  for (const entry of ENV_MANIFEST) {
    const target = entry.targets.find((t) => t.id === targetId);
    if (!target) {
      continue;
    }
    if (!entry.requiredIn.includes(environment) && entry.boot?.include !== true) {
      continue;
    }
    const key = target.runtimeName ?? entry.canonical;
    env[key] ??= resolveBootEnvValue(entry);
  }
}

/** Boot profile for API OpenAPI generation and integration tests (development). */
export function applyApiBootEnv(env: NodeJS.ProcessEnv = process.env): void {
  applyTargetBootEnv("api", "development", env);
}
