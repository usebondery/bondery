import { redirectRequestSchema } from "@bondery/schemas";
import { EXAMPLE_EXTENSION_MANIFEST_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import { z } from "zod";

export const extensionManifestSchema = z
  .object({
    extension: z.object({
      latestVersion: z.string().meta({ example: "1.9.1" }),
      minVersion: z.string().meta({ example: "1.0.0" }),
      storeUrl: z
        .string()
        .meta({ example: "https://chrome.google.com/webstore/detail/bondery/example" }),
    }),
  })
  .meta({ example: EXAMPLE_EXTENSION_MANIFEST_RESPONSE });

export const redirectBodySchema = redirectRequestSchema;

export const redirectQuerySchema = z.object({
  facebook: z.string().optional(),
  firstName: z.string().optional(),
  headline: z.string().optional(),
  instagram: z.string().optional(),
  lastName: z.string().optional(),
  linkedin: z.string().optional(),
  location: z.string().optional(),
  middleName: z.string().optional(),
  profileImageUrl: z.string().optional(),
});
