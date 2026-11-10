import { z } from "zod";
import type { OAuthProviderId, OAuthProvidersBitmap, OAuthProvidersResponse } from "./types.js";

export const oauthProviderIdSchema = z.enum([
  "github",
  "linkedin",
]) satisfies z.ZodType<OAuthProviderId>;

export const oauthProvidersBitmapSchema = z
  .object({
    email: z.boolean().describe("True when email sign-in is available"),
    github: z.boolean().describe("True when GitHub sign-in is available"),
    linkedin: z.boolean().describe("True when LinkedIn sign-in is available"),
  })
  .strict() satisfies z.ZodType<OAuthProvidersBitmap>;

export const oauthProvidersResponseSchema = z
  .object({
    oauthProviders: oauthProvidersBitmapSchema.describe(
      "Sign-in providers enabled for this deployment",
    ),
  })
  .strict()
  .meta({
    example: {
      oauthProviders: {
        email: true,
        github: true,
        linkedin: true,
      },
    },
  }) satisfies z.ZodType<OAuthProvidersResponse>;
