type BetterAuthSecretVersion = {
  version: number;
  value: string;
};

const MIN_SECRET_LENGTH = 32;

export type { BetterAuthSecretVersion };

export function parseBetterAuthSecretsString(raw: string): BetterAuthSecretVersion[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("BONDERY_PRIVATE_BETTER_AUTH_SECRETS is empty");
  }

  const entries = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new Error("BONDERY_PRIVATE_BETTER_AUTH_SECRETS has no entries");
  }

  const secrets: BetterAuthSecretVersion[] = [];
  const seenVersions = new Set<number>();

  for (const entry of entries) {
    const colonIndex = entry.indexOf(":");
    if (colonIndex <= 0) {
      throw new Error(`Invalid BONDERY_PRIVATE_BETTER_AUTH_SECRETS entry: ${entry}`);
    }

    const versionStr = entry.slice(0, colonIndex).trim();
    const value = entry.slice(colonIndex + 1).trim();
    const version = Number.parseInt(versionStr, 10);

    if (!Number.isFinite(version) || version < 1) {
      throw new Error(`Invalid secret version: ${versionStr}`);
    }
    if (seenVersions.has(version)) {
      throw new Error(`Duplicate secret version: ${version}`);
    }
    if (value.length < MIN_SECRET_LENGTH) {
      throw new Error(`Secret version ${version} must be at least ${MIN_SECRET_LENGTH} characters`);
    }

    seenVersions.add(version);
    secrets.push({ value, version });
  }

  const maxVersion = Math.max(...secrets.map((secret) => secret.version));
  if (secrets[0]?.version !== maxVersion) {
    throw new Error(
      "BONDERY_PRIVATE_BETTER_AUTH_SECRETS: current secret (highest version) must be listed first",
    );
  }

  return secrets;
}

export function resolveBetterAuthSecrets(
  env: NodeJS.ProcessEnv = process.env,
): BetterAuthSecretVersion[] {
  const raw = env.BONDERY_PRIVATE_BETTER_AUTH_SECRETS;
  if (!raw?.trim()) {
    throw new Error(
      "Missing BONDERY_PRIVATE_BETTER_AUTH_SECRETS (format: version:secret[,version:secret...])",
    );
  }

  return parseBetterAuthSecretsString(raw);
}
