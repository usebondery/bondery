import { avatarTransformQuerySchema } from "@bondery/schemas/http";
import { z } from "zod";

export const lookupPlatformSchema = z.enum(["instagram", "linkedin", "facebook"]);

export const bySocialQuerySchema = z.object({
  avatarQuality: avatarTransformQuerySchema.shape.avatarQuality,
  avatarSize: avatarTransformQuerySchema.shape.avatarSize,
  handle: z.string().optional(),
  platform: z.string().optional(),
});

export const mapBoundsQuerySchema = z.object({
  avatarQuality: avatarTransformQuerySchema.shape.avatarQuality,
  avatarSize: avatarTransformQuerySchema.shape.avatarSize,
  limit: z.coerce.number().int().min(1).max(1000).optional().default(500),
  maxLat: z.coerce.number().min(-90).max(90),
  maxLon: z.coerce.number().min(-180).max(180),
  minLat: z.coerce.number().min(-90).max(90),
  minLon: z.coerce.number().min(-180).max(180),
});

export const mapPinsQuerySchema = mapBoundsQuerySchema;
export const mapAddressPinsQuerySchema = mapBoundsQuerySchema;
