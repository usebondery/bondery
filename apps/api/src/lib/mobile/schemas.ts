import { EXAMPLE_MOBILE_MANIFEST_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import { z } from "zod";

export const mobileManifestSchema = z
  .object({
    mobile: z.object({
      latestVersion: z.string().meta({ example: "1.9.1" }),
    }),
  })
  .meta({ example: EXAMPLE_MOBILE_MANIFEST_RESPONSE });
