/**
 * Validates OpenAPI fixture examples against their Zod schemas.
 *
 * Usage: npx tsx scripts/check-openapi-examples.ts
 */

import type { z } from "zod";
import {
  createApiKeyInputSchema,
  apiKeyCreatedSchema,
  apiKeyListItemSchema,
  apiKeysListResponseSchema,
  updateApiKeyLabelInputSchema,
} from "#entities/api-keys.js";
import {
  createInteractionInputSchema,
  interactionResponseSchema,
  interactionsListResponseSchema,
  updateInteractionInputSchema,
} from "#entities/activity.js";
import {
  apiSuccessResponseSchema,
  apiErrorResponseSchema,
  feedbackFormSchema,
  photoUploadResponseSchema,
  shareContactRequestSchema,
} from "#entities/api.js";
import {
  geocodeSuggestResponseSchema,
  geocodeTimezoneResponseSchema,
} from "#entities/address.js";
import {
  createContactApiInputSchema,
  createContactBodySchema,
  createContactRelationshipInputSchema,
  contactRelationshipResponseSchema,
  contactRelationshipsResponseSchema,
  contactResponseSchema,
  contactsListResponseSchema,
  createContactResponseSchema,
  deleteContactResponseSchema,
  deleteContactsRequestSchema,
  deleteContactsResponseSchema,
  enrichEligibleCountResponseSchema,
  enrichQueueInitBodySchema,
  enrichQueueInitResponseSchema,
  enrichQueuePatchBodySchema,
  enrichQueueNextBatchResponseSchema,
  enrichQueueStatusCountsSchema,
  linkedInDataResponseSchema,
  linkedInDataUpsertResponseSchema,
  mapAddressPinsResponseSchema,
  mapPinsResponseSchema,
  bySocialLookupResponseSchema,
  updateContactInputSchema,
  updateContactRelationshipInputSchema,
} from "#entities/contact.js";
import {
  chatMessagesListResponseSchema,
  chatRequestSchema,
  chatSessionsListResponseSchema,
  updateChatSessionBodySchema,
} from "#entities/chat.js";
import {
  addContactsToGroupRequestSchema,
  addContactsToGroupResponseSchema,
  contactGroupsResponseSchema,
  createGroupSchema,
  groupContactsListResponseSchema,
  groupResponseSchema,
  groupsListResponseSchema,
  removeGroupMembersRequestSchema,
  removeGroupMembersResponseSchema,
  updateGroupSchema,
} from "#entities/group.js";
import { importantDatesListResponseSchema } from "#entities/important-date.js";
import {
  enrichContactRequestSchema,
  instagramImportCommitRequestSchema,
  instagramImportCommitResponseSchema,
  instagramParseResponseSchema,
  linkedInDataRequestSchema,
  linkedInImportCommitRequestSchema,
  linkedInImportCommitResponseSchema,
  linkedInParseResponseSchema,
  redirectRequestSchema,
  redirectResponseSchema,
  vcardImportCommitRequestSchema,
  vcardImportCommitResponseSchema,
  vcardParseResponseSchema,
} from "#entities/import.js";
import { mergeContactsRequestSchema, declineMergeRecommendationResponseSchema, mergeContactsResponseSchema, mergeRecommendationsResponseSchema, refreshMergeRecommendationsResponseSchema } from "#entities/merge.js";
import { reminderDigestRequestSchema, reminderDigestResponseSchema, upcomingRemindersResponseSchema } from "#entities/reminder.js";
import { updateAccountInputSchema, updateSettingsBodySchema, userAccountResponseSchema, userSettingsResponseSchema } from "#entities/settings.js";
import {
  contactTagBodySchema,
  contactTagListResponseSchema,
  createTagInputSchema,
  tagMembersListResponseSchema,
  tagMembershipRequestSchema,
  tagResponseSchema,
  tagsListResponseSchema,
  tagUpdateResponseSchema,
  updateTagSchema,
} from "#entities/tag.js";
import { messageResponseSchema } from "#entities/_shared.js";
import { syncBootstrapResponseSchema, syncPullResponseSchema } from "#sync/pull.js";
import { syncPushRequestSchema, syncPushResponseSchema } from "#sync/push.js";
import { syncConflictErrorResponseSchema } from "#sync/conflict.js";
import {
  geocodeSuggestResponseWireSchema,
  geocodeTimezoneResponseWireSchema,
  idsRequestBodySchema,
  importantDatesReplaceBodySchema,
} from "#http/index.js";

type ExampleEntry = {
  name: string;
  schema: z.ZodType;
};

const RESPONSE_SCHEMA_EXAMPLES: ExampleEntry[] = [
  { name: "messageResponseSchema", schema: messageResponseSchema },
  { name: "apiSuccessResponseSchema", schema: apiSuccessResponseSchema },
  { name: "apiErrorResponseSchema", schema: apiErrorResponseSchema },
  { name: "syncConflictErrorResponseSchema", schema: syncConflictErrorResponseSchema },
  { name: "photoUploadResponseSchema", schema: photoUploadResponseSchema },
  { name: "contactResponseSchema", schema: contactResponseSchema },
  { name: "createContactResponseSchema", schema: createContactResponseSchema },
  { name: "contactsListResponseSchema", schema: contactsListResponseSchema },
  { name: "mapPinsResponseSchema", schema: mapPinsResponseSchema },
  { name: "mapAddressPinsResponseSchema", schema: mapAddressPinsResponseSchema },
  { name: "contactRelationshipsResponseSchema", schema: contactRelationshipsResponseSchema },
  { name: "contactRelationshipResponseSchema", schema: contactRelationshipResponseSchema },
  { name: "deleteContactsResponseSchema", schema: deleteContactsResponseSchema },
  { name: "deleteContactResponseSchema", schema: deleteContactResponseSchema },
  { name: "bySocialLookupResponseSchema", schema: bySocialLookupResponseSchema },
  { name: "linkedInDataResponseSchema", schema: linkedInDataResponseSchema },
  { name: "enrichEligibleCountResponseSchema", schema: enrichEligibleCountResponseSchema },
  { name: "enrichQueueStatusCountsSchema", schema: enrichQueueStatusCountsSchema },
  { name: "enrichQueueInitResponseSchema", schema: enrichQueueInitResponseSchema },
  { name: "enrichQueueNextBatchResponseSchema", schema: enrichQueueNextBatchResponseSchema },
  { name: "linkedInDataUpsertResponseSchema", schema: linkedInDataUpsertResponseSchema },
  { name: "mergeContactsResponseSchema", schema: mergeContactsResponseSchema },
  { name: "mergeRecommendationsResponseSchema", schema: mergeRecommendationsResponseSchema },
  { name: "declineMergeRecommendationResponseSchema", schema: declineMergeRecommendationResponseSchema },
  { name: "refreshMergeRecommendationsResponseSchema", schema: refreshMergeRecommendationsResponseSchema },
  { name: "groupsListResponseSchema", schema: groupsListResponseSchema },
  { name: "groupResponseSchema", schema: groupResponseSchema },
  { name: "groupContactsListResponseSchema", schema: groupContactsListResponseSchema },
  { name: "addContactsToGroupResponseSchema", schema: addContactsToGroupResponseSchema },
  { name: "removeGroupMembersResponseSchema", schema: removeGroupMembersResponseSchema },
  { name: "contactGroupsResponseSchema", schema: contactGroupsResponseSchema },
  { name: "tagsListResponseSchema", schema: tagsListResponseSchema },
  { name: "tagResponseSchema", schema: tagResponseSchema },
  { name: "tagUpdateResponseSchema", schema: tagUpdateResponseSchema },
  { name: "tagMembersListResponseSchema", schema: tagMembersListResponseSchema },
  { name: "contactTagListResponseSchema", schema: contactTagListResponseSchema },
  { name: "interactionsListResponseSchema", schema: interactionsListResponseSchema },
  { name: "interactionResponseSchema", schema: interactionResponseSchema },
  { name: "importantDatesListResponseSchema", schema: importantDatesListResponseSchema },
  { name: "upcomingRemindersResponseSchema", schema: upcomingRemindersResponseSchema },
  { name: "reminderDigestResponseSchema", schema: reminderDigestResponseSchema },
  { name: "redirectResponseSchema", schema: redirectResponseSchema },
  { name: "linkedInParseResponseSchema", schema: linkedInParseResponseSchema },
  { name: "linkedInImportCommitResponseSchema", schema: linkedInImportCommitResponseSchema },
  { name: "instagramParseResponseSchema", schema: instagramParseResponseSchema },
  { name: "instagramImportCommitResponseSchema", schema: instagramImportCommitResponseSchema },
  { name: "vcardParseResponseSchema", schema: vcardParseResponseSchema },
  { name: "vcardImportCommitResponseSchema", schema: vcardImportCommitResponseSchema },
  { name: "syncPullResponseSchema", schema: syncPullResponseSchema },
  { name: "syncBootstrapResponseSchema", schema: syncBootstrapResponseSchema },
  { name: "syncPushResponseSchema", schema: syncPushResponseSchema },
  { name: "userSettingsResponseSchema", schema: userSettingsResponseSchema },
  { name: "userAccountResponseSchema", schema: userAccountResponseSchema },
  { name: "apiKeysListResponseSchema", schema: apiKeysListResponseSchema },
  { name: "apiKeyListItemSchema", schema: apiKeyListItemSchema },
  { name: "apiKeyCreatedSchema", schema: apiKeyCreatedSchema },
  { name: "chatSessionsListResponseSchema", schema: chatSessionsListResponseSchema },
  { name: "chatMessagesListResponseSchema", schema: chatMessagesListResponseSchema },
  { name: "geocodeSuggestResponseSchema", schema: geocodeSuggestResponseSchema },
  { name: "geocodeTimezoneResponseSchema", schema: geocodeTimezoneResponseSchema },
  { name: "geocodeSuggestResponseWireSchema", schema: geocodeSuggestResponseWireSchema },
  { name: "geocodeTimezoneResponseWireSchema", schema: geocodeTimezoneResponseWireSchema },
];

function getExample(schema: z.ZodType): unknown {
  const meta = schema.meta();
  if (meta && typeof meta === "object" && "example" in meta) {
    return meta.example;
  }
  return undefined;
}

const REQUEST_SCHEMA_EXAMPLES: ExampleEntry[] = [
  { name: "createContactApiInputSchema", schema: createContactApiInputSchema },
  { name: "createContactBodySchema", schema: createContactBodySchema },
  { name: "updateContactInputSchema", schema: updateContactInputSchema },
  { name: "deleteContactsRequestSchema", schema: deleteContactsRequestSchema },
  { name: "createContactRelationshipInputSchema", schema: createContactRelationshipInputSchema },
  { name: "updateContactRelationshipInputSchema", schema: updateContactRelationshipInputSchema },
  { name: "enrichQueueInitBodySchema", schema: enrichQueueInitBodySchema },
  { name: "enrichQueuePatchBodySchema", schema: enrichQueuePatchBodySchema },
  { name: "createGroupSchema", schema: createGroupSchema },
  { name: "updateGroupSchema", schema: updateGroupSchema },
  { name: "addContactsToGroupRequestSchema", schema: addContactsToGroupRequestSchema },
  { name: "removeGroupMembersRequestSchema", schema: removeGroupMembersRequestSchema },
  { name: "createTagInputSchema", schema: createTagInputSchema },
  { name: "updateTagSchema", schema: updateTagSchema },
  { name: "tagMembershipRequestSchema", schema: tagMembershipRequestSchema },
  { name: "contactTagBodySchema", schema: contactTagBodySchema },
  { name: "idsRequestBodySchema", schema: idsRequestBodySchema },
  { name: "createInteractionInputSchema", schema: createInteractionInputSchema },
  { name: "updateInteractionInputSchema", schema: updateInteractionInputSchema },
  { name: "importantDatesReplaceBodySchema", schema: importantDatesReplaceBodySchema },
  { name: "mergeContactsRequestSchema", schema: mergeContactsRequestSchema },
  { name: "enrichContactRequestSchema", schema: enrichContactRequestSchema },
  { name: "linkedInDataRequestSchema", schema: linkedInDataRequestSchema },
  { name: "linkedInImportCommitRequestSchema", schema: linkedInImportCommitRequestSchema },
  { name: "instagramImportCommitRequestSchema", schema: instagramImportCommitRequestSchema },
  { name: "vcardImportCommitRequestSchema", schema: vcardImportCommitRequestSchema },
  { name: "redirectRequestSchema", schema: redirectRequestSchema },
  { name: "shareContactRequestSchema", schema: shareContactRequestSchema },
  { name: "feedbackFormSchema", schema: feedbackFormSchema },
  { name: "createApiKeyInputSchema", schema: createApiKeyInputSchema },
  { name: "updateApiKeyLabelInputSchema", schema: updateApiKeyLabelInputSchema },
  { name: "updateAccountInputSchema", schema: updateAccountInputSchema },
  { name: "updateSettingsBodySchema", schema: updateSettingsBodySchema },
  { name: "updateChatSessionBodySchema", schema: updateChatSessionBodySchema },
  { name: "chatRequestSchema", schema: chatRequestSchema },
  { name: "syncPushRequestSchema", schema: syncPushRequestSchema },
  { name: "reminderDigestRequestSchema", schema: reminderDigestRequestSchema },
];

function validateExamples(entries: ExampleEntry[], failures: string[]) {
  for (const { name, schema } of entries) {
    const example = getExample(schema);
    if (example === undefined) {
      failures.push(`${name}: missing .meta({ example })`);
      continue;
    }

    const result = schema.safeParse(example);
    if (!result.success) {
      failures.push(`${name}: example failed validation — ${result.error.message}`);
    }
  }
}

function run() {
  const failures: string[] = [];

  validateExamples(RESPONSE_SCHEMA_EXAMPLES, failures);
  validateExamples(REQUEST_SCHEMA_EXAMPLES, failures);

  if (failures.length > 0) {
    console.error("OpenAPI example validation failed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
    process.exit(1);
  }

  const total = RESPONSE_SCHEMA_EXAMPLES.length + REQUEST_SCHEMA_EXAMPLES.length;
  console.log(`check-openapi-examples: ok (${total} schemas)`);
}

run();
