import { ENV_MANIFEST } from "./manifest-entries.js";
import { OPS_ENV_VARS } from "./manifest-ops-keys.js";
import { applyTransform } from "./manifest-targets.js";
import type { EnvEnvironment, EnvTargetWrite, EnvVarDef, TargetId } from "./manifest-types.js";

/** Manifest entries eligible for `pnpm run env:pull` (Infisical → root `.env.local`). */
export function getSyncableEnvVars(): EnvVarDef[] {
  return ENV_MANIFEST.filter((entry) => entry.syncable === true);
}

export function getRequiredVarsForTarget(
  targetId: TargetId,
  environment: EnvEnvironment,
): string[] {
  const names = new Set<string>();
  for (const entry of ENV_MANIFEST) {
    if (!entry.requiredIn.includes(environment)) {
      continue;
    }
    for (const target of entry.targets) {
      if (target.id !== targetId) {
        continue;
      }
      names.add(target.runtimeName ?? entry.canonical);
    }
  }
  return [...names].sort((a, b) => Number(a > b) - Number(a < b));
}

export function getRuntimeNamesForTarget(targetId: TargetId): string[] {
  const names = new Set<string>();
  for (const entry of ENV_MANIFEST) {
    if (entry.turboAffectsCache === false) {
      continue;
    }
    for (const target of entry.targets) {
      if (target.id !== targetId) {
        continue;
      }
      names.add(target.runtimeName ?? entry.canonical);
    }
  }
  return [...names].sort((a, b) => Number(a > b) - Number(a < b));
}

export function getAllRuntimeNames(): string[] {
  const names = new Set<string>();
  for (const entry of ENV_MANIFEST) {
    names.add(entry.canonical);
    for (const target of entry.targets) {
      names.add(target.runtimeName ?? entry.canonical);
    }
  }
  for (const name of OPS_ENV_VARS) {
    names.add(name);
  }
  return [...names].sort((a, b) => Number(a > b) - Number(a < b));
}

export function resolveCanonicalValue(
  rootEnv: Record<string, string>,
  entry: EnvVarDef,
  target: EnvTargetWrite,
): string | undefined {
  if (target.deriveFrom) {
    const source = rootEnv[target.deriveFrom];
    if (source === undefined || source === "") {
      return undefined;
    }
    return applyTransform(target.transform, source);
  }
  const value = rootEnv[entry.canonical];
  if (value === undefined) {
    return undefined;
  }
  return value;
}
