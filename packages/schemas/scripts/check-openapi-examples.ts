/**
 * Validates OpenAPI fixture examples against their Zod schemas.
 *
 * Usage: npx tsx scripts/check-openapi-examples.ts
 */

import type { z } from "zod";
import { apiKeyCreatedSchema, apiKeyListItemSchema, apiKeysListResponseSchema } from "#entities/api-keys.js";
import {
  interactionResponseSchema,
  interactionsListResponseSchema,
} from "#entities/activity.js";
import {
  apiSuccessResponseSchema,
  apiErrorResponseSchema,
  photoUploadResponseSchema,
} from "#entities/api.js";
import {
  geocodeSuggestResponseSchema,
  geocodeTimezoneResponseSchema,
} from "#entities/address.js";
import {
  contactRelationshipResponseSchema,
  contactRelationshipsResponseSchema,
  contactResponseSchema,
  contactsListResponseSchema,
  createContactResponseSchema,
  deleteContactResponseSchema,
  deleteContactsResponseSchema,
  enrichEligibleCountResponseSchema,
  enrichQueueInitResponseSchema,
  enrichQueueNextBatchResponseSchema,
  enrichQueueStatusCountsSchema,
  linkedInDataResponseSchema,
  linkedInDataUpsertResponseSchema,
  mapAddressPinsResponseSchema,
  mapPinsResponseSchema,
  bySocialLookupResponseSchema,
} from "#entities/contact.js";
import {
  chatMessagesListResponseSchema,
  chatSessionsListResponseSchema,
} from "#entities/chat.js";
import {
  addContactsToGroupResponseSchema,
  contactGroupsResponseSchema,
  groupContactsListResponseSchema,
  groupResponseSchema,
  groupsListResponseSchema,
  removeGroupMembersResponseSchema,
} from "#entities/group.js";
import { importantDatesListResponseSchema } from "#entities/important-date.js";
import {
  instagramImportCommitResponseSchema,
  instagramParseResponseSchema,
  linkedInImportCommitResponseSchema,
  linkedInParseResponseSchema,
  redirectResponseSchema,
  vcardImportCommitResponseSchema,
  vcardParseResponseSchema,
} from "#entities/import.js";
import {
  declineMergeRecommendationResponseSchema,
  mergeContactsResponseSchema,
  mergeRecommendationsResponseSchema,
  refreshMergeRecommendationsResponseSchema,
} from "#entities/merge.js";
import {
  reminderDigestResponseSchema,
  upcomingRemindersResponseSchema,
} from "#entities/reminder.js";
import { userAccountResponseSchema, userSettingsResponseSchema } from "#entities/settings.js";
import {
  contactTagListResponseSchema,
  tagMembersListResponseSchema,
  tagResponseSchema,
  tagsListResponseSchema,
  tagUpdateResponseSchema,
} from "#entities/tag.js";
import { messageResponseSchema } from "#entities/_shared.js";
import { syncBootstrapResponseSchema, syncPullResponseSchema } from "#sync/pull.js";
import { syncPushResponseSchema } from "#sync/push.js";
import { syncConflictErrorResponseSchema } from "#sync/conflict.js";
import {
  geocodeSuggestResponseWireSchema,
  geocodeTimezoneResponseWireSchema,
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

function run() {
  const failures: string[] = [];

  for (const { name, schema } of RESPONSE_SCHEMA_EXAMPLES) {
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

  if (failures.length > 0) {
    console.error("OpenAPI example validation failed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
    process.exit(1);
  }

  console.log(`check-openapi-examples: ok (${RESPONSE_SCHEMA_EXAMPLES.length} schemas)`);
}

run();
