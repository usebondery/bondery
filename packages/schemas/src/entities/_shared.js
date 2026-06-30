import { z } from "zod";
export const idSchema = z.string();
export const userIdSchema = z.string();
export const createdAtSchema = z.string();
export const updatedAtSchema = z.string();
export const entityIdentitySchema = z.object({
    id: idSchema,
    userId: userIdSchema,
});
export const entityAuditSchema = z.object({
    createdAt: createdAtSchema,
    updatedAt: updatedAtSchema,
});
export const entityNullableAuditSchema = z.object({
    createdAt: createdAtSchema.nullable(),
    updatedAt: updatedAtSchema.nullable(),
});
export const idsRequestSchema = z.object({
    ids: z.array(idSchema),
});
export const messageSchema = z.string();
export const messageResponseSchema = z.object({
    message: messageSchema,
});
export const personIdsSelectionSchema = z.object({
    personIds: z.array(idSchema),
});
export const excludePersonIdsSchema = z.array(idSchema).optional();
export function labelFieldSchema(maxLength, fieldName = "Label") {
    return z
        .string()
        .trim()
        .min(1, { error: `${fieldName} is required` })
        .max(maxLength, {
        error: `${fieldName} must be at most ${maxLength} characters`,
    });
}
export function nullableTrimmedStringSchema(maxLength) {
    return z.union([z.string(), z.null()]).transform((value, context) => {
        if (value === null) {
            return null;
        }
        const trimmed = value.trim();
        if (typeof maxLength === "number" && trimmed.length > maxLength) {
            context.addIssue({
                code: "custom",
                message: `Value must be at most ${maxLength} characters`,
            });
            return z.NEVER;
        }
        return trimmed || null;
    });
}
export function makeListResponseSchema(key, itemSchema) {
    return z.object({
        [key]: z.array(itemSchema),
        totalCount: z.number(),
    });
}
export function makeCollectionResponseSchema(key, itemSchema) {
    return z.object({
        [key]: z.array(itemSchema),
    });
}
export function withCountAndPreviewSchema(baseSchema, previewSchema) {
    return baseSchema.extend({
        contactCount: z.number(),
        previewContacts: z.array(previewSchema).optional(),
    });
}
