import { contactIdSchema } from "@bondery/schemas";
import { avatarTransformQuerySchema } from "@bondery/schemas/http";
import { z } from "zod";

export const lookupPlatformSchema = z.enum(["instagram", "linkedin", "facebook"]);

export const bySocialQuerySchema = z.object({
  avatarQuality: avatarTransformQuerySchema.shape.avatarQuality,
  avatarSize: avatarTransformQuerySchema.shape.avatarSize,
  handle: z.string().optional().describe("Social handle to match"),
  platform: z.string().optional().describe("Social network the handle belongs to"),
});

export const mapBoundsQuerySchema = z.object({
  avatarQuality: avatarTransformQuerySchema.shape.avatarQuality,
  avatarSize: avatarTransformQuerySchema.shape.avatarSize,
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .default(500)
    .describe("Maximum number of pins to return. Defaults to 500, maximum 1000."),
  maxLat: z.coerce.number().min(-90).max(90).describe("North edge of the bounding box"),
  maxLon: z.coerce.number().min(-180).max(180).describe("East edge of the bounding box"),
  minLat: z.coerce.number().min(-90).max(90).describe("South edge of the bounding box"),
  minLon: z.coerce.number().min(-180).max(180).describe("West edge of the bounding box"),
});

export const mapPinsQuerySchema = mapBoundsQuerySchema;
export const mapAddressPinsQuerySchema = mapBoundsQuerySchema;

export const relationshipGraphQuerySchema = z.object({
  avatarQuality: avatarTransformQuerySchema.shape.avatarQuality,
  avatarSize: avatarTransformQuerySchema.shape.avatarSize,
  focus: contactIdSchema
    .optional()
    .describe("Contact to center the graph on. Omit for the full graph."),
  groups: z.enum(["1"]).optional().describe("Set to `1` to include group clusters"),
  hubs: z.enum(["1"]).optional().describe("Set to `1` to include relationship hub nodes"),
});
