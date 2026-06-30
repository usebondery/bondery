import { z } from "zod";
export declare const idSchema: z.ZodString;
export declare const userIdSchema: z.ZodString;
export declare const createdAtSchema: z.ZodString;
export declare const updatedAtSchema: z.ZodString;
export declare const entityIdentitySchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
}, z.core.$strip>;
export declare const entityAuditSchema: z.ZodObject<{
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const entityNullableAuditSchema: z.ZodObject<{
    createdAt: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const idsRequestSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const messageSchema: z.ZodString;
export declare const messageResponseSchema: z.ZodObject<{
    message: z.ZodString;
}, z.core.$strip>;
export declare const personIdsSelectionSchema: z.ZodObject<{
    personIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const excludePersonIdsSchema: z.ZodOptional<z.ZodArray<z.ZodString>>;
export declare function labelFieldSchema(maxLength: number, fieldName?: string): z.ZodString;
export declare function nullableTrimmedStringSchema(maxLength?: number): z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
export declare function makeListResponseSchema<K extends string, S extends z.ZodTypeAny>(key: K, itemSchema: S): z.ZodObject<Record<K, z.ZodArray<S>> & {
    totalCount: z.ZodNumber;
}>;
export declare function makeCollectionResponseSchema<K extends string, S extends z.ZodTypeAny>(key: K, itemSchema: S): z.ZodObject<Record<K, z.ZodArray<S>>>;
export declare function withCountAndPreviewSchema<S extends z.ZodObject<z.core.$ZodLooseShape>, P extends z.ZodTypeAny>(baseSchema: S, previewSchema: P): z.ZodObject<{
    [x: string]: any;
    contactCount: z.ZodNumber;
    previewContacts: z.ZodOptional<z.ZodArray<P>>;
}, z.core.$strip>;
