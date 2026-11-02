import { WEBAPP_NAME } from "@bondery/helpers";
import { readBuildMetadata } from "@bondery/helpers/infra/build-metadata";
import { WEBSITE_URL } from "@/lib/config";
import { discoveryCorsPreflight, withDiscoveryCors } from "@/lib/discovery-cors";
import websitePackage from "../../../../package.json" with { type: "json" };
import catalog from "./manifest.json";

/** ARD manifest schema version (not the Bondery app version). */
const ARD_SPEC_VERSION = "1.0" as const;

type ArdCatalogSourceEntry = {
  description: string;
  displayName: string;
  kind: string;
  path: string;
  representativeQueries: string[];
  tags: string[];
  type: string;
};

type ArdCatalogManifest = {
  entries: ArdCatalogSourceEntry[];
  updatedAt: string;
};

type ArdManifestEntry = {
  description: string;
  displayName: string;
  identifier: string;
  representativeQueries: string[];
  tags: string[];
  type: string;
  updatedAt: string;
  url: string;
  version: string;
};

const manifest: ArdCatalogManifest = catalog;

function catalogVersion(): string {
  return readBuildMetadata().version ?? websitePackage.version;
}

export const dynamic = "force-dynamic";

export function GET() {
  const origin = WEBSITE_URL.replace(/\/+$/, "");
  const publisherHost = new URL(WEBSITE_URL).hostname;
  const version = catalogVersion();

  const entries: ArdManifestEntry[] = manifest.entries.map((entry) => ({
    description: entry.description,
    displayName: entry.displayName,
    identifier: `urn:air:${publisherHost}:${entry.kind}`,
    representativeQueries: entry.representativeQueries,
    tags: entry.tags,
    type: entry.type,
    updatedAt: manifest.updatedAt,
    url: `${origin}${entry.path}`,
    version,
  }));

  return Response.json(
    {
      entries,
      host: {
        displayName: WEBAPP_NAME,
        documentationUrl: `${origin}/docs`,
        identifier: `did:web:${publisherHost}`,
      },
      specVersion: ARD_SPEC_VERSION,
    },
    {
      headers: withDiscoveryCors({
        "Cache-Control": "max-age=86400",
        "Content-Type": "application/json",
      }),
    },
  );
}

/** Crawlers fetch the catalog cross-origin. */
export const OPTIONS = discoveryCorsPreflight;
