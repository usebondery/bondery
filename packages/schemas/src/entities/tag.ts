import { z } from "zod";
import { GROUP_LABEL_MAX_LENGTH } from "../constants/index.js";
import { hexColorSchema } from "../primitives/index.js";
import { contactPreviewSchema } from "./contact.js";
import {
  entityAuditSchema,
  entityIdentitySchema,
  idsRequestSchema,
  labelFieldSchema,
  makeCollectionResponseSchema,
  makeListResponseSchema,
  makePaginatedListResponseSchema,
  personIdsSelectionSchema,
} from "./_shared.js";

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
  createdAt: z.string().nullable(),
});

export const createTagSchema = tagEditableFieldsSchema;

/** API payload for creating a tag. */
export const createTagInputSchema = z.object({ label: tagLabelSchema });

export const updateTagSchema = createTagSchema.partial();

export const tagsListResponseSchema = makeListResponseSchema("tags", tagWithCountSchema);

export const tagMembersListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactPreviewSchema,
);

export const contactTagsResponseSchema = makeCollectionResponseSchema("tags", tagWithCountSchema);

export const tagMembershipRequestSchema = personIdsSelectionSchema;

export const deleteTagsRequestSchema = idsRequestSchema;

export type Tag = z.infer<typeof tagSchema>;
export type TagWithCount = z.infer<typeof tagWithCountSchema>;
export type PeopleTag = z.infer<typeof peopleTagSchema>;
export type CreateTagInput = z.infer<typeof createTagInputSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type TagsListResponse = z.infer<typeof tagsListResponseSchema>;
export type TagMembersListResponse = z.infer<typeof tagMembersListResponseSchema>;
export type ContactTagsResponse = z.infer<typeof contactTagsResponseSchema>;
export type TagMembershipRequest = z.infer<typeof tagMembershipRequestSchema>;
export type DeleteTagsRequest = z.infer<typeof deleteTagsRequestSchema>;
