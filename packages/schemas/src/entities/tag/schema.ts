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
  color: hexColorSchema.describe("Hex color used for the tag chip"),
  label: tagLabelSchema.describe("Tag name"),
});

export const tagSchema = entityIdentitySchema
  .extend({
    color: z.string().nullable().describe("Hex color used for the tag chip"),
    label: z.string().describe("Tag name"),
  })
  .extend(entityAuditSchema.shape) satisfies z.ZodType<Tag>;

export const tagWithCountSchema = tagSchema.extend({
  contactCount: z.number().describe("Number of contacts with this tag"),
  previewContacts: z
    .array(contactPreviewSchema)
    .optional()
    .describe("Small sample of tagged contacts, for previews"),
}) satisfies z.ZodType<TagWithCount>;

export const peopleTagSchema = z.object({
  created_at: createdAtSchema.describe("Time this tag was applied"),
  id: z.string().describe("Membership identifier"),
  personId: z.string().describe("Contact identifier"),
  tagId: z.string().describe("Tag identifier"),
  userId: z.string().describe("Owner account identifier"),
}) satisfies z.ZodType<PeopleTag>;

export const createTagSchema = tagEditableFieldsSchema;

/** API payload for creating a tag. `color` is optional; the API picks one when omitted. */
export const createTagInputSchema = tagEditableFieldsSchema.partial({
  color: true,
}) satisfies z.ZodType<CreateTagInput>;

export const updateTagSchema = createTagSchema.partial() satisfies z.ZodType<UpdateTagInput>;

export const tagResponseSchema = z.object({
  tag: tagSchema.describe("Tag record"),
}) satisfies z.ZodType<TagResponse>;

export const tagUpdateResponseSchema = tagResponseSchema satisfies z.ZodType<TagUpdateResponse>;

export const addContactsToTagResponseSchema = z.object({
  addedCount: z.number().describe("Number of contacts tagged"),
  skippedCount: z.number().describe("Number of contacts that already had this tag"),
}) satisfies z.ZodType<AddContactsToTagResponse>;

export const removeContactsFromTagResponseSchema = z.object({
  removedCount: z.number().describe("Number of contacts untagged"),
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
  tagId: z.string().min(1).describe("Tag identifier"),
}) satisfies z.ZodType<ContactTagBody>;

export const deleteTagsRequestSchema = idsRequestSchema satisfies z.ZodType<DeleteTagsRequest>;
