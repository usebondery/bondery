import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  addContactsToTagResponseSchema,
  contactTagBodySchema,
  contactTagListResponseSchema,
  contactTagsResponseSchema,
  createTagInputSchema,
  deleteTagsRequestSchema,
  peopleTagSchema,
  removeContactsFromTagResponseSchema,
  tagContactsListResponseSchema,
  tagMembershipRequestSchema,
  tagMembersListResponseSchema,
  tagResponseSchema,
  tagSchema,
  tagsListResponseSchema,
  tagUpdateResponseSchema,
  tagWithCountSchema,
  updateTagSchema,
} from "./schema.js";
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

export type _Tag = Assert<IsEqual<Tag, z.infer<typeof tagSchema>>>;
export type _TagWithCount = Assert<IsEqual<TagWithCount, z.infer<typeof tagWithCountSchema>>>;
export type _PeopleTag = Assert<IsEqual<PeopleTag, z.infer<typeof peopleTagSchema>>>;
export type _CreateTagInput = Assert<IsEqual<CreateTagInput, z.infer<typeof createTagInputSchema>>>;
export type _UpdateTagInput = Assert<IsEqual<UpdateTagInput, z.infer<typeof updateTagSchema>>>;
export type _TagResponse = Assert<IsEqual<TagResponse, z.infer<typeof tagResponseSchema>>>;
export type _TagUpdateResponse = Assert<
  IsEqual<TagUpdateResponse, z.infer<typeof tagUpdateResponseSchema>>
>;
export type _AddContactsToTagResponse = Assert<
  IsEqual<AddContactsToTagResponse, z.infer<typeof addContactsToTagResponseSchema>>
>;
export type _RemoveContactsFromTagResponse = Assert<
  IsEqual<RemoveContactsFromTagResponse, z.infer<typeof removeContactsFromTagResponseSchema>>
>;
export type _TagContactsListResponse = Assert<
  IsEqual<TagContactsListResponse, z.infer<typeof tagContactsListResponseSchema>>
>;
export type _TagsListResponse = Assert<
  IsEqual<TagsListResponse, z.infer<typeof tagsListResponseSchema>>
>;
export type _TagMembersListResponse = Assert<
  IsEqual<TagMembersListResponse, z.infer<typeof tagMembersListResponseSchema>>
>;
export type _ContactTagsResponse = Assert<
  IsEqual<ContactTagsResponse, z.infer<typeof contactTagsResponseSchema>>
>;
export type _ContactTagListResponse = Assert<
  IsEqual<ContactTagListResponse, z.infer<typeof contactTagListResponseSchema>>
>;
export type _TagMembershipRequest = Assert<
  IsEqual<TagMembershipRequest, z.infer<typeof tagMembershipRequestSchema>>
>;
export type _ContactTagBody = Assert<IsEqual<ContactTagBody, z.infer<typeof contactTagBodySchema>>>;
export type _DeleteTagsRequest = Assert<
  IsEqual<DeleteTagsRequest, z.infer<typeof deleteTagsRequestSchema>>
>;
