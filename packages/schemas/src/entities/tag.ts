import { z } from "zod";
import { GROUP_LABEL_MAX_LENGTH } from "#constants/index.js";
import { hexColorSchema } from "#primitives/index.js";
import { contactPreviewSchema, contactSchema } from "#entities/contact.js";
import {
  createdAtSchema,
  entityAuditSchema,
  entityIdentitySchema,
  idsRequestSchema,
  labelFieldSchema,
  makeCollectionResponseSchema,
  makeListResponseSchema,
  makePaginatedListResponseSchema,
  messageResponseSchema,
  personIdsSelectionSchema,
} from "#entities/_shared.js";
import {
  EXAMPLE_CONTACT_TAG_LIST_RESPONSE,
  EXAMPLE_TAG_MEMBERS_LIST_RESPONSE,
  EXAMPLE_TAG_RESPONSE,
  EXAMPLE_TAG_UPDATE_RESPONSE,
  EXAMPLE_TAGS_LIST_RESPONSE,
} from "#openapi/fixtures/schema-examples.js";
import {
  EXAMPLE_CONTACT_TAG_REQUEST,
  EXAMPLE_CREATE_TAG_REQUEST,
  EXAMPLE_PATCH_TAG_REQUEST,
  EXAMPLE_TAG_MEMBERSHIP_REQUEST,
} from "#openapi/fixtures/requests.js";

const tagLabelSchema = labelFieldSchema(GROUP_LABEL_MAX_LENGTH);

const tagEditableFieldsSchema = z.object({
  label: tagLabelSchema,
  color: hexColorSchema,
});

export const tagSchema = entityIdentitySchema.extend({
  label: z.string(),
  color: z.string().nullable(),
}).extend(entityAuditSchema.shape);

export const tagWithCountSchema = tagSchema.extend({
  contactCount: z.number(),
  previewContacts: z.array(contactPreviewSchema).optional(),
});

export const peopleTagSchema = z.object({
  id: z.string(),
  personId: z.string(),
  tagId: z.string(),
  userId: z.string(),
  created_at: createdAtSchema,
});

export const createTagSchema = tagEditableFieldsSchema;

/** API payload for creating a tag. */
export const createTagInputSchema = z.object({ label: tagLabelSchema }).meta({
  example: EXAMPLE_CREATE_TAG_REQUEST,
});

export const updateTagSchema = createTagSchema.partial().meta({
  example: EXAMPLE_PATCH_TAG_REQUEST,
});

export const tagResponseSchema = z
  .object({
    tag: tagSchema,
  })
  .meta({ example: EXAMPLE_TAG_RESPONSE });

export const tagUpdateResponseSchema = messageResponseSchema
  .extend({
    tag: tagSchema,
  })
  .meta({ example: EXAMPLE_TAG_UPDATE_RESPONSE });

export const tagContactsListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactSchema,
);

export const tagsListResponseSchema = makeListResponseSchema(
  "tags",
  tagWithCountSchema,
).meta({ example: EXAMPLE_TAGS_LIST_RESPONSE });

export const tagMembersListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactPreviewSchema,
).meta({ example: EXAMPLE_TAG_MEMBERS_LIST_RESPONSE });

export const contactTagsResponseSchema = makeCollectionResponseSchema("tags", tagWithCountSchema);

export const contactTagListResponseSchema = makeCollectionResponseSchema(
  "tags",
  tagSchema,
).meta({ example: EXAMPLE_CONTACT_TAG_LIST_RESPONSE });

export const tagMembershipRequestSchema = personIdsSelectionSchema.meta({
  example: EXAMPLE_TAG_MEMBERSHIP_REQUEST,
});

export const contactTagBodySchema = z.object({
  tagId: z.string().min(1),
}).meta({ example: EXAMPLE_CONTACT_TAG_REQUEST });

export const deleteTagsRequestSchema = idsRequestSchema;

export type Tag = z.infer<typeof tagSchema>;
export type TagWithCount = z.infer<typeof tagWithCountSchema>;
export type PeopleTag = z.infer<typeof peopleTagSchema>;
export type CreateTagInput = z.infer<typeof createTagInputSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type TagsListResponse = z.infer<typeof tagsListResponseSchema>;
export type TagMembersListResponse = z.infer<typeof tagMembersListResponseSchema>;
export type ContactTagsResponse = z.infer<typeof contactTagsResponseSchema>;
export type ContactTagListResponse = z.infer<typeof contactTagListResponseSchema>;
export type TagMembershipRequest = z.infer<typeof tagMembershipRequestSchema>;
export type DeleteTagsRequest = z.infer<typeof deleteTagsRequestSchema>;
