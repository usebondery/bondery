import { overlayProductionCalver } from "../version/calver.js";

type BuildMetadata = {
  gitSha?: string;
  version?: string;
};

/** Reads optional build metadata baked into container env at image build time. */
function readBuildMetadata(): BuildMetadata {
  const version = process.env["BONDERY_INFRA_VERSION"]?.trim();
  const gitSha = process.env["BONDERY_INFRA_GIT_SHA"]?.trim();
  return {
    ...(version ? { version } : {}),
    ...(gitSha ? { gitSha } : {}),
  };
}

function withBuildMetadata<T extends Record<string, unknown>>(body: T): T & BuildMetadata {
  const { gitSha, version } = readBuildMetadata();
  return {
    ...body,
    ...(gitSha ? { gitSha } : {}),
    ...(version ? { version } : {}),
  };
}

type ProbeLivenessStatus = BuildMetadata & {
  status: "ok";
  timestamp: string;
};

type ProbeReadinessStatus =
  | ProbeLivenessStatus
  | (BuildMetadata & { error: string; status: "unhealthy"; timestamp: string });

/** Shared liveness payload for api, webapp, and website container probes. */
function buildLivenessStatus(): ProbeLivenessStatus {
  return withBuildMetadata({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  });
}

export type { ProbeLivenessStatus };

/**
 * Product identity for manifest/export. A production CalVer pin (Dokploy
 * `BONDERY_INFRA_VERSION=X.Y.Z`) overlays in-image `package.json` so an RC-built
 * image can report GA after promote. Non-CalVer pins (`beta`) keep package.json.
 */
export function readRuntimeProductVersion(packageVersion: string): string {
  return overlayProductionCalver(packageVersion, process.env["BONDERY_INFRA_VERSION"]);
}

export type ProbeReadinessStatus =
  | ProbeLivenessStatus
  | (BuildMetadata & { error: string; status: "unhealthy"; timestamp: string });

/** Shared liveness payload for api, webapp, and website container probes. */
export function buildLivenessStatus(): ProbeLivenessStatus {
  return withBuildMetadata({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  });
}

/** Shared readiness payload for webapp and website container probes. */
export function buildReadinessStatus(ok: boolean, error?: string): ProbeReadinessStatus {
  const timestamp = new Date().toISOString();
  if (ok) {
    return withBuildMetadata({
      status: "ok" as const,
      timestamp,
    });
  }
  return withBuildMetadata({
    error: error ?? "unhealthy",
    status: "unhealthy" as const,
    timestamp,
  });
}

/** Shared readiness payload for webapp and website container probes. */
export function buildReadinessStatus(ok: boolean, error?: string): ProbeReadinessStatus {
  const timestamp = new Date().toISOString();
  if (ok) {
    return withBuildMetadata({
      status: "ok" as const,
      timestamp,
    });
  }
  return withBuildMetadata({
    error: error ?? "unhealthy",
    status: "unhealthy" as const,
    timestamp,
  });
}

export type { BuildMetadata, ProbeReadinessStatus };
export { buildLivenessStatus, readBuildMetadata };
