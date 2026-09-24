import { createRequire } from "node:module";
import { CHROME_EXTENSION_URL, MIN_EXTENSION_VERSION } from "@bondery/helpers";
import { readRuntimeProductVersion } from "@bondery/helpers/infra/build-metadata";
import { latestProductionCalver } from "@bondery/helpers/version/calver";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import type { AppFastifyInstance } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { extensionManifestSchema } from "./schemas.js";

const require = createRequire(import.meta.url);
const { version: packageVersion } = require("../../../package.json") as { version: string };

export function registerManifestRoute(fastify: AppFastifyInstance): void {
  fastify.get(
    "/manifest",
    {
      config: { rateLimit: false },
      schema: {
        description:
          "Public Chrome extension configuration. `minVersion` is the HTTP 426 floor (previous production CalVer). " +
          "`latestVersion` is the current production CalVer for a non-blocking update nudge. " +
          "Not a health probe — use `GET /health/live` for liveness.",
        response: withOkResponse(extensionManifestSchema, "Extension manifest"),
        tags: ["Extension"],
      } satisfies FastifyZodOpenApiSchema,
    },
    async () => {
      return {
        extension: {
          latestVersion: latestProductionCalver(
            readRuntimeProductVersion(packageVersion),
            MIN_EXTENSION_VERSION,
          ),
          minVersion: MIN_EXTENSION_VERSION,
          storeUrl: CHROME_EXTENSION_URL,
        },
      };
    },
  );
}
