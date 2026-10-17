import { createRequire } from "node:module";
import { MIN_EXTENSION_VERSION } from "@bondery/helpers";
import { readRuntimeProductVersion } from "@bondery/helpers/infra/build-metadata";
import { latestProductionCalver } from "@bondery/helpers/version/calver";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import type { AppFastifyInstance } from "../platform/fastify-types.js";
import { withOkResponse } from "../platform/openapi/responses.js";
import { mobileManifestSchema } from "./schemas.js";

const require = createRequire(import.meta.url);
const { version: packageVersion } = require("../../../package.json") as { version: string };

export function registerMobileManifestRoute(fastify: AppFastifyInstance): void {
  fastify.get(
    "/mobile/manifest",
    {
      config: { rateLimit: false },
      schema: {
        description:
          "Public mobile app configuration. `latestVersion` is the current production CalVer for a non-blocking update check. " +
          "Not a health probe — use `GET /health/live` for liveness.",
        response: withOkResponse(mobileManifestSchema, "Mobile manifest"),
        tags: ["Mobile"],
      } satisfies FastifyZodOpenApiSchema,
    },
    async () => {
      // Product CalVer is shared. MIN_EXTENSION_VERSION is the previous
      // production tag used while package.json is an RC.
      return {
        mobile: {
          latestVersion: latestProductionCalver(
            readRuntimeProductVersion(packageVersion),
            MIN_EXTENSION_VERSION,
          ),
        },
      };
    },
  );
}
