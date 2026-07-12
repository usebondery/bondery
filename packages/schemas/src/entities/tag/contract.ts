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

type _Tag = Assert<IsEqual<Tag, z.infer<typeof tagSchema>>>;
type _TagWithCount = Assert<IsEqual<TagWithCount, z.infer<typeof tagWithCountSchema>>>;
type _PeopleTag = Assert<IsEqual<PeopleTag, z.infer<typeof peopleTagSchema>>>;
type _CreateTagInput = Assert<IsEqual<CreateTagInput, z.infer<typeof createTagInputSchema>>>;
type _UpdateTagInput = Assert<IsEqual<UpdateTagInput, z.infer<typeof updateTagSchema>>>;
type _TagResponse = Assert<IsEqual<TagResponse, z.infer<typeof tagResponseSchema>>>;
type _TagUpdateResponse = Assert<
  IsEqual<TagUpdateResponse, z.infer<typeof tagUpdateResponseSchema>>
>;
type _AddContactsToTagResponse = Assert<
  IsEqual<AddContactsToTagResponse, z.infer<typeof addContactsToTagResponseSchema>>
>;
type _RemoveContactsFromTagResponse = Assert<
  IsEqual<RemoveContactsFromTagResponse, z.infer<typeof removeContactsFromTagResponseSchema>>
>;
type _TagContactsListResponse = Assert<
  IsEqual<TagContactsListResponse, z.infer<typeof tagContactsListResponseSchema>>
>;
type _TagsListResponse = Assert<IsEqual<TagsListResponse, z.infer<typeof tagsListResponseSchema>>>;
type _TagMembersListResponse = Assert<
  IsEqual<TagMembersListResponse, z.infer<typeof tagMembersListResponseSchema>>
>;
type _ContactTagsResponse = Assert<
  IsEqual<ContactTagsResponse, z.infer<typeof contactTagsResponseSchema>>
>;
type _ContactTagListResponse = Assert<
  IsEqual<ContactTagListResponse, z.infer<typeof contactTagListResponseSchema>>
>;
type _TagMembershipRequest = Assert<
  IsEqual<TagMembershipRequest, z.infer<typeof tagMembershipRequestSchema>>
>;
type _ContactTagBody = Assert<IsEqual<ContactTagBody, z.infer<typeof contactTagBodySchema>>>;
type _DeleteTagsRequest = Assert<
  IsEqual<DeleteTagsRequest, z.infer<typeof deleteTagsRequestSchema>>
>;
