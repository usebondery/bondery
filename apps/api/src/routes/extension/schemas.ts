import { redirectRequestSchema } from "@bondery/schemas";
import { z } from "zod";

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
