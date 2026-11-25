import { ENV_MANIFEST } from "./manifest-entries.js";
import type { OPS_DOKPLOY_SYNC_CONFIG_KEYS } from "./manifest-ops-keys.js";
import type { DokploySyncTarget, EnvVarDef } from "./manifest-types.js";

/** Keys never synced to deploy/bondery Dokploy compose (derived in compose or Dokploy UI). */
export const SERVICES_DOKPLOY_SYNC_EXCLUDE: Set<string> = new Set<string>([
  "BONDERY_INFRA_GIT_SHA",
  "BONDERY_INFRA_VERSION",
  "BONDERY_PRIVATE_S3_ENDPOINT",
  "BONDERY_PUBLIC_STORAGE_URL",
]);

export type DokploySyncTargetConfig = {
  composeIdKey: (typeof OPS_DOKPLOY_SYNC_CONFIG_KEYS)[number];
  webhookBranch?: string;
  webhookKey: (typeof OPS_DOKPLOY_SYNC_CONFIG_KEYS)[number];
  webhookPathSentinels: readonly string[];
};

export const DOKPLOY_SYNC_TARGETS: Record<DokploySyncTarget, DokploySyncTargetConfig> = {
  plausible: {
    composeIdKey: "BONDERY_OPS_DOKPLOY_PLAUSIBLE_COMPOSE_ID",
    webhookKey: "BONDERY_OPS_DOKPLOY_PLAUSIBLE_DEPLOY_WEBHOOK",
    /** Satisfy Dokploy watch-path checks when CI triggers the deploy webhook. */
    webhookPathSentinels: ["deploy/plausible"] as const,
  },
  services: {
    composeIdKey: "BONDERY_OPS_DOKPLOY_SERVICES_COMPOSE_ID",
    webhookKey: "BONDERY_OPS_DOKPLOY_SERVICES_DEPLOY_WEBHOOK",
    webhookPathSentinels: ["deploy/bondery"] as const,
  },
  "services-beta": {
    composeIdKey: "BONDERY_OPS_DOKPLOY_STAGING_SERVICES_COMPOSE_ID",
    webhookBranch: "main",
    webhookKey: "BONDERY_OPS_DOKPLOY_STAGING_SERVICES_DEPLOY_WEBHOOK",
    webhookPathSentinels: ["deploy/bondery"] as const,
  },
  website: {
    composeIdKey: "BONDERY_OPS_DOKPLOY_OPS_COMPOSE_ID",
    webhookKey: "BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK",
    webhookPathSentinels: ["deploy/ops"] as const,
  },
  "website-beta": {
    composeIdKey: "BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_COMPOSE_ID",
    webhookBranch: "main",
    webhookKey: "BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_DEPLOY_WEBHOOK",
    webhookPathSentinels: ["deploy/ops"] as const,
  },
};

/** Map Dokploy sync target to manifest payload target (beta stacks reuse production key sets). */
export function resolveDokploySyncPayloadTarget(target: DokploySyncTarget): DokploySyncTarget {
  if (target === "services-beta") {
    return "services";
  }
  if (target === "website-beta") {
    return "website";
  }
  return target;
}

/** Git ref branch for Dokploy deploy webhook payload (default release). */
export function getDokploySyncWebhookBranch(target: DokploySyncTarget): string {
  const branch = DOKPLOY_SYNC_TARGETS[target] as { webhookBranch?: string };
  return branch.webhookBranch ?? "release";
}

export type DokploySyncRow = { key: string; value: string };

/** Whether a manifest entry is uploaded for the given Dokploy sync target. */
export function entrySyncsToDokployTarget(entry: EnvVarDef, target: DokploySyncTarget): boolean {
  const syncTargets = entry.dokploySync?.targets;
  if (syncTargets?.includes(target)) {
    return true;
  }

  const resolveInheritedTarget = () => {
    if (target === "website-beta") {
      return "website";
    }
    if (target === "services-beta") {
      return "services";
    }
    return null;
  };
  const inheritedTarget = resolveInheritedTarget();
  if (inheritedTarget && syncTargets?.includes(inheritedTarget)) {
    return true;
  }

  if (
    (target === "services" || target === "services-beta") &&
    entry.deployExample?.include &&
    !SERVICES_DOKPLOY_SYNC_EXCLUDE.has(entry.canonical)
  ) {
    return true;
  }

  return false;
}

/** @deprecated Use collectDokploySyncRows(env, "website") */
export function collectOpsSyncRows(env: Record<string, string>): {
  missingRequired: string[];
  rows: DokploySyncRow[];
} {
  return collectDokploySyncRows(env, "website");
}

/** Build Dokploy upload rows for a sync target from Infisical-loaded env. */
export function collectDokploySyncRows(
  env: Record<string, string>,
  target: DokploySyncTarget,
): {
  missingRequired: string[];
  rows: DokploySyncRow[];
} {
  const rows: DokploySyncRow[] = [];
  const missingRequired: string[] = [];

  for (const entry of ENV_MANIFEST) {
    if (!entrySyncsToDokployTarget(entry, target)) {
      continue;
    }

    const raw = env[entry.canonical];
    const value = raw?.trim() ?? "";

    if (entry.requiredIn.includes("production") && value === "") {
      missingRequired.push(entry.canonical);
      continue;
    }

    if (value === "") {
      continue;
    }

    rows.push({ key: entry.canonical, value });
  }

  rows.sort((a, b) => a.key.localeCompare(b.key, "en", { sensitivity: "variant" }));

  return {
    missingRequired,
    rows,
  };
}
