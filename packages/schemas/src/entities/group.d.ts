import { z } from "zod";
export declare const groupSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    label: z.ZodString;
    emoji: z.ZodString;
    color: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const groupWithCountSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    label: z.ZodString;
    emoji: z.ZodString;
    color: z.ZodString;
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
export declare const peopleGroupSchema: z.ZodObject<{
    id: z.ZodString;
    personId: z.ZodString;
    groupId: z.ZodString;
    userId: z.ZodString;
    createdAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const createGroupSchema: z.ZodObject<{
    label: z.ZodString;
    emoji: z.ZodString;
    color: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
}, z.core.$strip>;
export declare const updateGroupSchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    emoji: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
}, z.core.$strip>;
export declare const addContactsToGroupRequestSchema: z.ZodUnion<readonly [z.ZodObject<{
    personIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    contactFilter: z.ZodObject<{
        q: z.ZodOptional<z.ZodString>;
        sort: z.ZodOptional<z.ZodEnum<{
            nameAsc: "nameAsc";
            nameDesc: "nameDesc";
            surnameAsc: "surnameAsc";
            surnameDesc: "surnameDesc";
            interactionAsc: "interactionAsc";
            interactionDesc: "interactionDesc";
            createdAtAsc: "createdAtAsc";
            createdAtDesc: "createdAtDesc";
        }>>;
    }, z.core.$strip>;
    excludePersonIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>]>;
export declare const addContactsToGroupResponseSchema: z.ZodObject<{
    message: z.ZodString;
    addedCount: z.ZodNumber;
    skippedCount: z.ZodNumber;
}, z.core.$strip>;
export declare const removeGroupMembersRequestSchema: z.ZodUnion<readonly [z.ZodObject<{
    personIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    memberFilter: z.ZodObject<{
        q: z.ZodOptional<z.ZodString>;
        sort: z.ZodOptional<z.ZodEnum<{
            nameAsc: "nameAsc";
            nameDesc: "nameDesc";
            surnameAsc: "surnameAsc";
            surnameDesc: "surnameDesc";
            interactionAsc: "interactionAsc";
            interactionDesc: "interactionDesc";
            createdAtAsc: "createdAtAsc";
            createdAtDesc: "createdAtDesc";
        }>>;
    }, z.core.$strip>;
    excludePersonIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>]>;
export declare const removeGroupMembersResponseSchema: z.ZodObject<{
    message: z.ZodString;
    removedCount: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const groupsListResponseSchema: z.ZodObject<Record<"groups", z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    label: z.ZodString;
    emoji: z.ZodString;
    color: z.ZodString;
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
export declare const groupResponseSchema: z.ZodObject<{
    group: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        label: z.ZodString;
        emoji: z.ZodString;
        color: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const contactGroupsResponseSchema: z.ZodObject<Record<"groups", z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    label: z.ZodString;
    emoji: z.ZodString;
    color: z.ZodString;
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
export declare const deleteGroupsRequestSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type Group = z.infer<typeof groupSchema>;
export type GroupWithCount = z.infer<typeof groupWithCountSchema>;
export type PeopleGroup = z.infer<typeof peopleGroupSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddContactsToGroupRequest = z.infer<typeof addContactsToGroupRequestSchema>;
export type AddContactsToGroupResponse = z.infer<typeof addContactsToGroupResponseSchema>;
export type RemoveGroupMembersRequest = z.infer<typeof removeGroupMembersRequestSchema>;
export type RemoveGroupMembersResponse = z.infer<typeof removeGroupMembersResponseSchema>;
export type GroupsListResponse = z.infer<typeof groupsListResponseSchema>;
export type GroupResponse = z.infer<typeof groupResponseSchema>;
export type ContactGroupsResponse = z.infer<typeof contactGroupsResponseSchema>;
export type DeleteGroupsRequest = z.infer<typeof deleteGroupsRequestSchema>;
