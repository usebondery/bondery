import { redirectRequestSchema } from "@bondery/schemas";
import { EXAMPLE_EXTENSION_MANIFEST_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import { z } from "zod";

export const extensionManifestSchema = z
  .object({
    extension: z
      .object({
        latestVersion: z
          .string()
          .describe("Latest published extension version")
          .meta({ example: "1.9.1" }),
        minVersion: z
          .string()
          .describe("Oldest extension version this API still supports")
          .meta({ example: "1.0.0" }),
        storeUrl: z
          .string()
          .describe("Chrome Web Store URL for the extension")
          .meta({ example: "https://chrome.google.com/webstore/detail/bondery/example" }),
      })
      .describe("Chrome extension version info"),
  })
  .meta({ example: EXAMPLE_EXTENSION_MANIFEST_RESPONSE });

export const redirectBodySchema = redirectRequestSchema;

export const redirectQuerySchema = z.object({
  facebook: z.string().optional().describe("Facebook profile URL or handle"),
  firstName: z.string().optional().describe("Given name"),
  headline: z.string().optional().describe("Short role or description line"),
  instagram: z.string().optional().describe("Instagram profile URL or handle"),
  lastName: z.string().optional().describe("Family name"),
  linkedin: z.string().optional().describe("LinkedIn profile URL"),
  location: z.string().optional().describe("Free-text location"),
  middleName: z.string().optional().describe("Middle name"),
  profileImageUrl: z.string().optional().describe("Profile image URL to import as the avatar"),
});
