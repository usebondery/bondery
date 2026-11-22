import type { EnvVarDef, ExampleProfile } from "./manifest-types.js";

/** True when a public URL example is Portless local (`.test` or classic `.localhost`). */
function isPortlessLocalPublicUrl(value: string): boolean {
  return value.includes("usebondery.test") || value.includes("localhost");
}

/** Operator-facing sections in `deploy/bondery/.env.example` (order matters). */
export const DEPLOY_GROUP_ORDER = [
  "Image tags",
  "Public hostnames",
  "Redis",
  "Postgres",
  "Better Auth",
  "Webapp OAuth",
  "Chrome extension OAuth",
  "Storage",
  "Email",
  "Stripe",
  "Optional integrations (API)",
  "Optional webapp analytics",
  "Optional API admin analytics",
  "Build metadata",
] as const;

/** Operator-facing sections in `deploy/ops/.env.example` (order matters). */
export const OPS_GROUP_ORDER = [
  "Image tags",
  "Public hostnames",
  "Mobile associated domains",
  "Website analytics",
  "Build metadata",
] as const;

/** Operator-facing sections in `deploy/plausible/.env.example` (order matters). */
export const PLAUSIBLE_GROUP_ORDER = [
  "Public hostname",
  "Plausible secrets",
  "Plausible options",
] as const;

/** Resolve example value for a manifest entry and generation profile. */
export function resolveExampleValue(entry: EnvVarDef, profile: ExampleProfile): string {
  if (profile === "deploy") {
    return entry.deployExample?.value ?? entry.exampleValue;
  }
  if (profile === "ops") {
    return entry.opsExample?.value ?? entry.exampleValue;
  }
  if (profile === "plausible") {
    return entry.plausibleExample?.value ?? entry.exampleValue;
  }

  let value = entry.exampleValue;
  if (profile === "production") {
    if (entry.canonical === "BONDERY_PUBLIC_WEBAPP_URL" && isPortlessLocalPublicUrl(value)) {
      value = "https://app.usebondery.com";
    } else if (
      entry.canonical === "BONDERY_PUBLIC_WEBSITE_URL" &&
      isPortlessLocalPublicUrl(value)
    ) {
      value = "https://usebondery.com";
    } else if (entry.canonical === "BONDERY_PUBLIC_API_URL" && isPortlessLocalPublicUrl(value)) {
      value = "https://api.usebondery.com";
    } else if (
      entry.canonical === "BONDERY_INFRA_INTERNAL_API_URL" ||
      entry.canonical === "BONDERY_INFRA_INTERNAL_API_CA_FILE"
    ) {
      // Compose sets the internal Docker DNS URL and its CA; keep production examples empty.
      value = "";
    } else if (entry.canonical === "BONDERY_PUBLIC_BILLING_UPGRADES_ENABLED") {
      value = "false";
    } else if (
      entry.canonical === "BONDERY_PRIVATE_EMAIL_HOST" ||
      entry.canonical === "BONDERY_PRIVATE_EMAIL_PORT"
    ) {
      value = entry.deployExample?.value ?? value;
    }
  }
  return value;
}

/** Sort deploy example rows by DEPLOY_GROUP_ORDER then key. */
export function sortDeployExampleRows<T extends { group: string; key: string }>(rows: T[]): T[] {
  const groupRank = new Map(DEPLOY_GROUP_ORDER.map((group, index) => [group, index]));
  return [...rows].sort((a, b) => {
    const rankA = groupRank.get(a.group as (typeof DEPLOY_GROUP_ORDER)[number]) ?? 999;
    const rankB = groupRank.get(b.group as (typeof DEPLOY_GROUP_ORDER)[number]) ?? 999;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.key.localeCompare(b.key);
  });
}

/** Sort ops example rows by OPS_GROUP_ORDER then key. */
export function sortOpsExampleRows<T extends { group: string; key: string }>(rows: T[]): T[] {
  const groupRank = new Map(OPS_GROUP_ORDER.map((group, index) => [group, index]));
  return [...rows].sort((a, b) => {
    const rankA = groupRank.get(a.group as (typeof OPS_GROUP_ORDER)[number]) ?? 999;
    const rankB = groupRank.get(b.group as (typeof OPS_GROUP_ORDER)[number]) ?? 999;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.key.localeCompare(b.key);
  });
}

/** Sort plausible example rows by PLAUSIBLE_GROUP_ORDER then key. */
export function sortPlausibleExampleRows<T extends { group: string; key: string }>(rows: T[]): T[] {
  const groupRank = new Map(PLAUSIBLE_GROUP_ORDER.map((group, index) => [group, index]));
  return [...rows].sort((a, b) => {
    const rankA = groupRank.get(a.group as (typeof PLAUSIBLE_GROUP_ORDER)[number]) ?? 999;
    const rankB = groupRank.get(b.group as (typeof PLAUSIBLE_GROUP_ORDER)[number]) ?? 999;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.key.localeCompare(b.key);
  });
}
