import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
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
  contactSortOrderSchema,
  contactsFilterSchema,
  contactsListResponseSchema,
  contactsListStatsSchema,
  contactsSelectableListResponseSchema,
  createContactApiInputSchema,
  createContactInputSchema,
  createContactRelationshipInputSchema,
  createContactResponseSchema,
  deleteContactResponseSchema,
  deleteContactsRequestSchema,
  deleteContactsResponseSchema,
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
  mapAddressPinSchema,
  mapAddressPinsResponseSchema,
  mapPinSchema,
  mapPinsResponseSchema,
  relationshipTypeSchema,
  shareableFieldSchema,
  updateContactIdentitySchema,
  updateContactRelationshipInputSchema,
  workHistoryEntrySchema,
} from "./schema.js";
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
  ContactSortOrder,
  ContactsFilter,
  ContactsListResponse,
  ContactsListStats,
  ContactsSelectableListResponse,
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
  RelationshipType,
  ShareableField,
  UpdateContactIdentityFormInput,
  UpdateContactIdentityInput,
  UpdateContactRelationshipInput,
  WorkHistoryEntry,
} from "./types.js";

type _RelationshipType = Assert<IsEqual<RelationshipType, z.infer<typeof relationshipTypeSchema>>>;
type _Contact = Assert<IsEqual<Contact, z.infer<typeof contactSchema>>>;
type _ContactPreview = Assert<IsEqual<ContactPreview, z.infer<typeof contactPreviewSchema>>>;
type _ContactSelectable = Assert<
  IsEqual<ContactSelectable, z.infer<typeof contactSelectableSchema>>
>;
type _ContactListItem = Assert<IsEqual<ContactListItem, z.infer<typeof contactListItemSchema>>>;
type _ContactRelationship = Assert<
  IsEqual<ContactRelationship, z.infer<typeof contactRelationshipSchema>>
>;
type _ContactRelationshipWithPeople = Assert<
  IsEqual<ContactRelationshipWithPeople, z.infer<typeof contactRelationshipWithPeopleSchema>>
>;
type _CreateContactInput = Assert<
  IsEqual<CreateContactInput, z.infer<typeof createContactApiInputSchema>>
>;
type _CreateContactFromFullNameInput = Assert<
  IsEqual<CreateContactFromFullNameInput, z.infer<typeof createContactInputSchema>>
>;
type _UpdateContactIdentityFormInput = Assert<
  IsEqual<UpdateContactIdentityFormInput, z.input<typeof updateContactIdentitySchema>>
>;
type _UpdateContactIdentityInput = Assert<
  IsEqual<UpdateContactIdentityInput, z.output<typeof updateContactIdentitySchema>>
>;
type _ContactResponse = Assert<IsEqual<ContactResponse, z.infer<typeof contactResponseSchema>>>;
type _CreateContactResponse = Assert<
  IsEqual<CreateContactResponse, z.infer<typeof createContactResponseSchema>>
>;
type _MapPin = Assert<IsEqual<MapPin, z.infer<typeof mapPinSchema>>>;
type _MapPinsResponse = Assert<IsEqual<MapPinsResponse, z.infer<typeof mapPinsResponseSchema>>>;
type _AddressPin = Assert<IsEqual<AddressPin, z.infer<typeof mapAddressPinSchema>>>;
type _MapAddressPinsResponse = Assert<
  IsEqual<MapAddressPinsResponse, z.infer<typeof mapAddressPinsResponseSchema>>
>;
type _ContactsListStats = Assert<
  IsEqual<ContactsListStats, z.infer<typeof contactsListStatsSchema>>
>;
type _ContactsListResponse = Assert<
  IsEqual<ContactsListResponse, z.infer<typeof contactsListResponseSchema>>
>;
type _ContactsSelectableListResponse = Assert<
  IsEqual<ContactsSelectableListResponse, z.infer<typeof contactsSelectableListResponseSchema>>
>;
type _CreateContactRelationshipInput = Assert<
  IsEqual<CreateContactRelationshipInput, z.infer<typeof createContactRelationshipInputSchema>>
>;
type _UpdateContactRelationshipInput = Assert<
  IsEqual<UpdateContactRelationshipInput, z.infer<typeof updateContactRelationshipInputSchema>>
>;
type _ContactRelationshipsResponse = Assert<
  IsEqual<ContactRelationshipsResponse, z.infer<typeof contactRelationshipsResponseSchema>>
>;
type _ContactSortOrder = Assert<IsEqual<ContactSortOrder, z.infer<typeof contactSortOrderSchema>>>;
type _ContactsFilter = Assert<IsEqual<ContactsFilter, z.infer<typeof contactsFilterSchema>>>;
type _DeleteContactsRequest = Assert<
  IsEqual<DeleteContactsRequest, z.infer<typeof deleteContactsRequestSchema>>
>;
type _DeleteContactsResponse = Assert<
  IsEqual<DeleteContactsResponse, z.infer<typeof deleteContactsResponseSchema>>
>;
type _BySocialLookupResponse = Assert<
  IsEqual<BySocialLookupResponse, z.infer<typeof bySocialLookupResponseSchema>>
>;
type _DeleteContactResponse = Assert<
  IsEqual<DeleteContactResponse, z.infer<typeof deleteContactResponseSchema>>
>;
type _WorkHistoryEntry = Assert<IsEqual<WorkHistoryEntry, z.infer<typeof workHistoryEntrySchema>>>;
type _EducationEntry = Assert<IsEqual<EducationEntry, z.infer<typeof educationEntrySchema>>>;
type _LinkedInDataResponse = Assert<
  IsEqual<LinkedInDataResponse, z.infer<typeof linkedInDataResponseSchema>>
>;
type _EnrichQueueStatus = Assert<
  IsEqual<EnrichQueueStatus, z.infer<typeof enrichQueueStatusSchema>>
>;
type _EnrichQueueItem = Assert<IsEqual<EnrichQueueItem, z.infer<typeof enrichQueueItemSchema>>>;
type _EnrichEligibleCountResponse = Assert<
  IsEqual<EnrichEligibleCountResponse, z.infer<typeof enrichEligibleCountResponseSchema>>
>;
type _EnrichQueueCountResponse = Assert<
  IsEqual<EnrichQueueCountResponse, z.infer<typeof enrichQueueCountResponseSchema>>
>;
type _KeepInTouchCountResponse = Assert<
  IsEqual<KeepInTouchCountResponse, z.infer<typeof keepInTouchCountResponseSchema>>
>;
type _EnrichQueueStatusCounts = Assert<
  IsEqual<EnrichQueueStatusCounts, z.infer<typeof enrichQueueStatusCountsSchema>>
>;
type _EnrichQueueInitResponse = Assert<
  IsEqual<EnrichQueueInitResponse, z.infer<typeof enrichQueueInitResponseSchema>>
>;
type _EnrichQueueNextBatchItem = Assert<
  IsEqual<EnrichQueueNextBatchItem, z.infer<typeof enrichQueueNextBatchItemSchema>>
>;
type _EnrichQueueNextBatchResponse = Assert<
  IsEqual<EnrichQueueNextBatchResponse, z.infer<typeof enrichQueueNextBatchResponseSchema>>
>;
type _LinkedInDataUpsertResponse = Assert<
  IsEqual<LinkedInDataUpsertResponse, z.infer<typeof linkedInDataUpsertResponseSchema>>
>;
type _ContactRelationshipResponse = Assert<
  IsEqual<ContactRelationshipResponse, z.infer<typeof contactRelationshipResponseSchema>>
>;
type _EnrichQueueInitBody = Assert<
  IsEqual<EnrichQueueInitBody, z.infer<typeof enrichQueueInitBodySchema>>
>;
type _EnrichQueuePatchBody = Assert<
  IsEqual<EnrichQueuePatchBody, z.infer<typeof enrichQueuePatchBodySchema>>
>;
type _ShareableField = Assert<IsEqual<ShareableField, z.infer<typeof shareableFieldSchema>>>;
