import { z } from "zod";
export declare const tagSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    label: z.ZodString;
    color: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const tagWithCountSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    label: z.ZodString;
    color: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    contactCount: z.ZodNumber;
    previewContacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        lastName: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        id: z.ZodString;
        avatar: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const peopleTagSchema: z.ZodObject<{
    id: z.ZodString;
    personId: z.ZodString;
    tagId: z.ZodString;
    userId: z.ZodString;
    createdAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const createTagSchema: z.ZodObject<{
    label: z.ZodString;
    color: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
}, z.core.$strip>;
/** API payload for creating a tag. */
export declare const createTagInputSchema: z.ZodObject<{
    label: z.ZodString;
}, z.core.$strip>;
export declare const updateTagSchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
}, z.core.$strip>;
export declare const tagsListResponseSchema: z.ZodObject<Record<"tags", z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    label: z.ZodString;
    color: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    contactCount: z.ZodNumber;
    previewContacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        lastName: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        id: z.ZodString;
        avatar: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>>> & {
    totalCount: z.ZodNumber;
}, z.core.$strip>;
export declare const contactTagsResponseSchema: z.ZodObject<Record<"tags", z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    label: z.ZodString;
    color: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    contactCount: z.ZodNumber;
    previewContacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        lastName: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        id: z.ZodString;
        avatar: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>>>, z.core.$strip>;
export declare const tagMembershipRequestSchema: z.ZodObject<{
    personIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const deleteTagsRequestSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type Tag = z.infer<typeof tagSchema>;
export type TagWithCount = z.infer<typeof tagWithCountSchema>;
export type PeopleTag = z.infer<typeof peopleTagSchema>;
export type CreateTagInput = z.infer<typeof createTagInputSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type TagsListResponse = z.infer<typeof tagsListResponseSchema>;
export type ContactTagsResponse = z.infer<typeof contactTagsResponseSchema>;
export type TagMembershipRequest = z.infer<typeof tagMembershipRequestSchema>;
export type DeleteTagsRequest = z.infer<typeof deleteTagsRequestSchema>;
