import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  educationEntrySchema,
  enrichEligibleCountResponseSchema,
  enrichQueueCountResponseSchema,
  enrichQueueInitBodySchema,
  enrichQueueInitResponseSchema,
  enrichQueueItemSchema,
  enrichQueueNextBatchItemSchema,
  enrichQueueNextBatchResponseSchema,
  enrichQueuePatchBodySchema,
  enrichQueueStatusCountsSchema,
  enrichQueueStatusSchema,
  keepInTouchCountResponseSchema,
  linkedInDataResponseSchema,
  linkedInDataUpsertResponseSchema,
  workHistoryEntrySchema,
} from "./enrich-schema.js";
import type {
  contactSortOrderSchema,
  contactsFilterSchema,
  contactsListResponseSchema,
  contactsListStatsSchema,
  contactsSelectableListResponseSchema,
  deleteContactsRequestSchema,
  deleteContactsResponseSchema,
  mapAddressPinSchema,
  mapAddressPinsResponseSchema,
  mapPinSchema,
  mapPinsResponseSchema,
} from "./list-schema.js";
import type {
  relationshipGraphEdgeSchema,
  relationshipGraphGroupSchema,
  relationshipGraphHubSchema,
  relationshipGraphNodeSchema,
  relationshipGraphResponseSchema,
  relationshipGraphUnlinkedPersonSchema,
} from "./relationship-graph-schema.js";
import type {
  bySocialLookupResponseSchema,
  contactListItemSchema,
  contactPreviewSchema,
  contactRelationshipResponseSchema,
  contactRelationshipSchema,
  contactRelationshipsResponseSchema,
  contactRelationshipWithPeopleSchema,
  contactResponseSchema,
  contactSchema,
  contactSelectableSchema,
  contactWritableFieldsSchema,
  createContactApiInputSchema,
  createContactInputSchema,
  createContactRelationshipInputSchema,
  createContactResponseSchema,
  deleteContactResponseSchema,
  personPreviewSchema,
  relationshipTypeSchema,
  updateContactIdentitySchema,
  updateContactInputSchema,
  updateContactRelationshipInputSchema,
} from "./schema.js";
import type {
  contactShareFieldPreviewSchema,
  contactSharePreviewResponseSchema,
  shareableFieldSchema,
} from "./share-schema.js";
import type {
  AddressPin,
  BySocialLookupResponse,
  Contact,
  ContactListItem,
  ContactPreview,
  ContactRelationship,
  ContactRelationshipResponse,
  ContactRelationshipsResponse,
  ContactRelationshipWithPeople,
  ContactResponse,
  ContactSelectable,
  ContactShareFieldPreview,
  ContactSharePreviewResponse,
  ContactSortOrder,
  ContactsFilter,
  ContactsListResponse,
  ContactsListStats,
  ContactsSelectableListResponse,
  ContactWritableFields,
  CreateContactFromFullNameInput,
  CreateContactInput,
  CreateContactRelationshipInput,
  CreateContactResponse,
  DeleteContactResponse,
  DeleteContactsRequest,
  DeleteContactsResponse,
  EducationEntry,
  EnrichEligibleCountResponse,
  EnrichQueueCountResponse,
  EnrichQueueInitBody,
  EnrichQueueInitResponse,
  EnrichQueueItem,
  EnrichQueueNextBatchItem,
  EnrichQueueNextBatchResponse,
  EnrichQueuePatchBody,
  EnrichQueueStatus,
  EnrichQueueStatusCounts,
  KeepInTouchCountResponse,
  LinkedInDataResponse,
  LinkedInDataUpsertResponse,
  MapAddressPinsResponse,
  MapPin,
  MapPinsResponse,
  PersonPreview,
  RelationshipGraphEdge,
  RelationshipGraphGroup,
  RelationshipGraphHub,
  RelationshipGraphNode,
  RelationshipGraphResponse,
  RelationshipGraphUnlinkedPerson,
  RelationshipType,
  ShareableField,
  UpdateContactIdentityFormInput,
  UpdateContactIdentityInput,
  UpdateContactInput,
  UpdateContactRelationshipInput,
  WorkHistoryEntry,
} from "./types.js";

export type _RelationshipType = Assert<
  IsEqual<RelationshipType, z.infer<typeof relationshipTypeSchema>>
>;
export type _Contact = Assert<IsEqual<Contact, z.infer<typeof contactSchema>>>;
export type _ContactPreview = Assert<IsEqual<ContactPreview, z.infer<typeof contactPreviewSchema>>>;
export type _PersonPreview = Assert<IsEqual<PersonPreview, z.infer<typeof personPreviewSchema>>>;
export type _ContactSelectable = Assert<
  IsEqual<ContactSelectable, z.infer<typeof contactSelectableSchema>>
>;
export type _ContactListItem = Assert<
  IsEqual<ContactListItem, z.infer<typeof contactListItemSchema>>
>;
export type _ContactRelationship = Assert<
  IsEqual<ContactRelationship, z.infer<typeof contactRelationshipSchema>>
>;
export type _ContactRelationshipWithPeople = Assert<
  IsEqual<ContactRelationshipWithPeople, z.infer<typeof contactRelationshipWithPeopleSchema>>
>;
export type _ContactWritableFields = Assert<
  IsEqual<ContactWritableFields, z.infer<typeof contactWritableFieldsSchema>>
>;
export type _CreateContactInput = Assert<
  IsEqual<CreateContactInput, z.infer<typeof createContactApiInputSchema>>
>;
export type _UpdateContactInput = Assert<
  IsEqual<UpdateContactInput, z.infer<typeof updateContactInputSchema>>
>;
export type _CreateContactFromFullNameInput = Assert<
  IsEqual<CreateContactFromFullNameInput, z.infer<typeof createContactInputSchema>>
>;
export type _UpdateContactIdentityFormInput = Assert<
  IsEqual<UpdateContactIdentityFormInput, z.input<typeof updateContactIdentitySchema>>
>;
export type _UpdateContactIdentityInput = Assert<
  IsEqual<UpdateContactIdentityInput, z.output<typeof updateContactIdentitySchema>>
>;
export type _ContactResponse = Assert<
  IsEqual<ContactResponse, z.infer<typeof contactResponseSchema>>
>;
export type _CreateContactResponse = Assert<
  IsEqual<CreateContactResponse, z.infer<typeof createContactResponseSchema>>
>;
export type _MapPin = Assert<IsEqual<MapPin, z.infer<typeof mapPinSchema>>>;
export type _MapPinsResponse = Assert<
  IsEqual<MapPinsResponse, z.infer<typeof mapPinsResponseSchema>>
>;
export type _AddressPin = Assert<IsEqual<AddressPin, z.infer<typeof mapAddressPinSchema>>>;
export type _MapAddressPinsResponse = Assert<
  IsEqual<MapAddressPinsResponse, z.infer<typeof mapAddressPinsResponseSchema>>
>;
export type _ContactsListStats = Assert<
  IsEqual<ContactsListStats, z.infer<typeof contactsListStatsSchema>>
>;
export type _ContactsListResponse = Assert<
  IsEqual<ContactsListResponse, z.infer<typeof contactsListResponseSchema>>
>;
export type _ContactsSelectableListResponse = Assert<
  IsEqual<ContactsSelectableListResponse, z.infer<typeof contactsSelectableListResponseSchema>>
>;
export type _CreateContactRelationshipInput = Assert<
  IsEqual<CreateContactRelationshipInput, z.infer<typeof createContactRelationshipInputSchema>>
>;
export type _UpdateContactRelationshipInput = Assert<
  IsEqual<UpdateContactRelationshipInput, z.infer<typeof updateContactRelationshipInputSchema>>
>;
export type _ContactRelationshipsResponse = Assert<
  IsEqual<ContactRelationshipsResponse, z.infer<typeof contactRelationshipsResponseSchema>>
>;
export type _RelationshipGraphNode = Assert<
  IsEqual<RelationshipGraphNode, z.infer<typeof relationshipGraphNodeSchema>>
>;
export type _RelationshipGraphEdge = Assert<
  IsEqual<RelationshipGraphEdge, z.infer<typeof relationshipGraphEdgeSchema>>
>;
export type _RelationshipGraphUnlinkedPerson = Assert<
  IsEqual<RelationshipGraphUnlinkedPerson, z.infer<typeof relationshipGraphUnlinkedPersonSchema>>
>;
export type _RelationshipGraphHub = Assert<
  IsEqual<RelationshipGraphHub, z.infer<typeof relationshipGraphHubSchema>>
>;
export type _RelationshipGraphGroup = Assert<
  IsEqual<RelationshipGraphGroup, z.infer<typeof relationshipGraphGroupSchema>>
>;
export type _RelationshipGraphResponse = Assert<
  IsEqual<RelationshipGraphResponse, z.infer<typeof relationshipGraphResponseSchema>>
>;
export type _ContactSortOrder = Assert<
  IsEqual<ContactSortOrder, z.infer<typeof contactSortOrderSchema>>
>;
export type _ContactsFilter = Assert<IsEqual<ContactsFilter, z.infer<typeof contactsFilterSchema>>>;
export type _DeleteContactsRequest = Assert<
  IsEqual<DeleteContactsRequest, z.infer<typeof deleteContactsRequestSchema>>
>;
export type _DeleteContactsResponse = Assert<
  IsEqual<DeleteContactsResponse, z.infer<typeof deleteContactsResponseSchema>>
>;
export type _BySocialLookupResponse = Assert<
  IsEqual<BySocialLookupResponse, z.infer<typeof bySocialLookupResponseSchema>>
>;
export type _DeleteContactResponse = Assert<
  IsEqual<DeleteContactResponse, z.infer<typeof deleteContactResponseSchema>>
>;
export type _WorkHistoryEntry = Assert<
  IsEqual<WorkHistoryEntry, z.infer<typeof workHistoryEntrySchema>>
>;
export type _EducationEntry = Assert<IsEqual<EducationEntry, z.infer<typeof educationEntrySchema>>>;
export type _LinkedInDataResponse = Assert<
  IsEqual<LinkedInDataResponse, z.infer<typeof linkedInDataResponseSchema>>
>;
export type _EnrichQueueStatus = Assert<
  IsEqual<EnrichQueueStatus, z.infer<typeof enrichQueueStatusSchema>>
>;
export type _EnrichQueueItem = Assert<
  IsEqual<EnrichQueueItem, z.infer<typeof enrichQueueItemSchema>>
>;
export type _EnrichEligibleCountResponse = Assert<
  IsEqual<EnrichEligibleCountResponse, z.infer<typeof enrichEligibleCountResponseSchema>>
>;
export type _EnrichQueueCountResponse = Assert<
  IsEqual<EnrichQueueCountResponse, z.infer<typeof enrichQueueCountResponseSchema>>
>;
export type _KeepInTouchCountResponse = Assert<
  IsEqual<KeepInTouchCountResponse, z.infer<typeof keepInTouchCountResponseSchema>>
>;
export type _EnrichQueueStatusCounts = Assert<
  IsEqual<EnrichQueueStatusCounts, z.infer<typeof enrichQueueStatusCountsSchema>>
>;
export type _EnrichQueueInitResponse = Assert<
  IsEqual<EnrichQueueInitResponse, z.infer<typeof enrichQueueInitResponseSchema>>
>;
export type _EnrichQueueNextBatchItem = Assert<
  IsEqual<EnrichQueueNextBatchItem, z.infer<typeof enrichQueueNextBatchItemSchema>>
>;
export type _EnrichQueueNextBatchResponse = Assert<
  IsEqual<EnrichQueueNextBatchResponse, z.infer<typeof enrichQueueNextBatchResponseSchema>>
>;
export type _LinkedInDataUpsertResponse = Assert<
  IsEqual<LinkedInDataUpsertResponse, z.infer<typeof linkedInDataUpsertResponseSchema>>
>;
export type _ContactRelationshipResponse = Assert<
  IsEqual<ContactRelationshipResponse, z.infer<typeof contactRelationshipResponseSchema>>
>;
export type _EnrichQueueInitBody = Assert<
  IsEqual<EnrichQueueInitBody, z.infer<typeof enrichQueueInitBodySchema>>
>;
export type _EnrichQueuePatchBody = Assert<
  IsEqual<EnrichQueuePatchBody, z.infer<typeof enrichQueuePatchBodySchema>>
>;
export type _ShareableField = Assert<IsEqual<ShareableField, z.infer<typeof shareableFieldSchema>>>;
export type _ContactShareFieldPreview = Assert<
  IsEqual<ContactShareFieldPreview, z.infer<typeof contactShareFieldPreviewSchema>>
>;
export type _ContactSharePreviewResponse = Assert<
  IsEqual<ContactSharePreviewResponse, z.infer<typeof contactSharePreviewResponseSchema>>
>;
