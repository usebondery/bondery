import { z } from "zod";
import { GROUP_LABEL_MAX_LENGTH } from "#constants/index.js";
import { hexColorSchema } from "#primitives/index.js";
import {
  createdAtSchema,
  entityAuditSchema,
  entityIdentitySchema,
  idsRequestSchema,
  labelFieldSchema,
  makeCollectionResponseSchema,
  makeListResponseSchema,
  makePaginatedListResponseSchema,
  personIdsSelectionSchema,
} from "../_shared/schema.js";
import { contactPreviewSchema, contactSchema } from "../contact/schema.js";
import type {
  AddContactsToTagResponse,
  ContactTagBody,
  ContactTagListResponse,
  ContactTagsResponse,
  CreateTagInput,
  DeleteTagsRequest,
  PeopleTag,
  RemoveContactsFromTagResponse,
  Tag,
  TagContactsListResponse,
  TagMembershipRequest,
  TagMembersListResponse,
  TagResponse,
  TagsListResponse,
  TagUpdateResponse,
  TagWithCount,
  UpdateTagInput,
} from "./types.js";

const tagLabelSchema = labelFieldSchema(GROUP_LABEL_MAX_LENGTH);

const tagEditableFieldsSchema = z.object({
  color: hexColorSchema,
  label: tagLabelSchema,
});

export const tagSchema = entityIdentitySchema
  .extend({
    color: z.string().nullable(),
    label: z.string(),
  })
  .extend(entityAuditSchema.shape) satisfies z.ZodType<Tag>;

export const tagWithCountSchema = tagSchema.extend({
  contactCount: z.number(),
  previewContacts: z.array(contactPreviewSchema).optional(),
}) satisfies z.ZodType<TagWithCount>;

export const peopleTagSchema = z.object({
  created_at: createdAtSchema,
  id: z.string(),
  personId: z.string(),
  tagId: z.string(),
  userId: z.string(),
}) satisfies z.ZodType<PeopleTag>;

export const createTagSchema = tagEditableFieldsSchema;

/** API payload for creating a tag. */
export const createTagInputSchema = z.object({
  label: tagLabelSchema,
}) satisfies z.ZodType<CreateTagInput>;

export const updateTagSchema = createTagSchema.partial() satisfies z.ZodType<UpdateTagInput>;

export const tagResponseSchema = z.object({
  tag: tagSchema,
}) satisfies z.ZodType<TagResponse>;

export const tagUpdateResponseSchema = tagResponseSchema satisfies z.ZodType<TagUpdateResponse>;

export const addContactsToTagResponseSchema = z.object({
  addedCount: z.number(),
}) satisfies z.ZodType<AddContactsToTagResponse>;

export const removeContactsFromTagResponseSchema = z.object({
  removedCount: z.number(),
}) satisfies z.ZodType<RemoveContactsFromTagResponse>;

export const tagContactsListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactSchema,
) satisfies z.ZodType<TagContactsListResponse>;

export const tagsListResponseSchema = makeListResponseSchema(
  "tags",
  tagWithCountSchema,
) satisfies z.ZodType<TagsListResponse>;

export const tagMembersListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactPreviewSchema,
) satisfies z.ZodType<TagMembersListResponse>;

export const contactTagsResponseSchema = makeCollectionResponseSchema(
  "tags",
  tagWithCountSchema,
) satisfies z.ZodType<ContactTagsResponse>;

export const contactTagListResponseSchema = makeCollectionResponseSchema(
  "tags",
  tagSchema,
) satisfies z.ZodType<ContactTagListResponse>;

export const tagMembershipRequestSchema =
  personIdsSelectionSchema satisfies z.ZodType<TagMembershipRequest>;

export const contactTagBodySchema = z.object({
  tagId: z.string().min(1),
}) satisfies z.ZodType<ContactTagBody>;

export const deleteTagsRequestSchema = idsRequestSchema satisfies z.ZodType<DeleteTagsRequest>;
