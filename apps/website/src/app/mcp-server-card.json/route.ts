import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { readBuildMetadata } from "@bondery/helpers/infra/build-metadata";
import { apiUrl } from "@/lib/api-url";
import { WEBSITE_URL } from "@/lib/config";
import { discoveryCorsPreflight, withDiscoveryCors } from "@/lib/discovery-cors";
import websitePackage from "../../../package.json" with { type: "json" };

/**
 * MCP Server Card (experimental `server-card` extension).
 *
 * `$schema` pins the `/v1/` shape. Once set, the card must not list `tools[]` —
 * agents read the live `tools/list` instead. `name` is a reverse-DNS identifier,
 * so the display name belongs in `title`.
 */
const SERVER_CARD_SCHEMA =
  "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json";
const SERVER_NAME = "com.usebondery/mcp";
const SERVER_TITLE = "Bondery";
/** Schema maximum is 100 characters. Keep capabilities, drop implementation detail. */
const SERVER_DESCRIPTION = "Personal CRM for contacts, groups, tags, interactions, and reminders.";
/** The API serves MCP 2026-07-28 only. */
const SUPPORTED_PROTOCOL_VERSIONS = ["2026-07-28"] as const;

/** Request-time so Docker build placeholders are not frozen into beta/prod catalogs. */
export function GET() {
  const version = readBuildMetadata().version ?? websitePackage.version;
  const origin = WEBSITE_URL.replace(/\/+$/, "");

  return Response.json(
    {
      $schema: SERVER_CARD_SCHEMA,
      description: SERVER_DESCRIPTION,
      icons: [
        {
          mimeType: "image/svg+xml",
          sizes: ["any"],
          src: `${origin}/logo.svg`,
        },
      ],
      name: SERVER_NAME,
      remotes: [
        {
          supportedProtocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
          type: "streamable-http",
          url: apiUrl(API_ROUTES.MCP),
        },
      ],
      repository: {
        id: "1110131829",
        source: "github",
        subfolder: "apps/api/src/routes/mcp",
        url: "https://github.com/usebondery/bondery",
      },
      title: SERVER_TITLE,
      version,
      websiteUrl: `${origin}/docs/apps/mcp`,
    },
    {
      headers: withDiscoveryCors({
        "Cache-Control": "max-age=86400",
        "Content-Type": "application/mcp-server-card+json; charset=utf-8",
      }),
    },
  );
}

/** Cross-origin agents read the card with a custom Accept type, so preflight is OPTIONS. */
export const OPTIONS = discoveryCorsPreflight;
