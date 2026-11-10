import { EXAMPLE_MOBILE_MANIFEST_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import { z } from "zod";

export const mobileManifestSchema = z
  .object({
    mobile: z
      .object({
        latestVersion: z
          .string()
          .describe("Latest published mobile app version")
          .meta({ example: "1.9.1" }),
      })
      .describe("Mobile app version info"),
  })
  .meta({ example: EXAMPLE_MOBILE_MANIFEST_RESPONSE });
