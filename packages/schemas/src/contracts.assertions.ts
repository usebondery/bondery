import { EXAMPLE_CONTACT_ID } from "#contact-id.js";
import { createInteractionInputSchema, interactionParticipantSchema } from "#entities/activity.js";
import { contactPreviewSchema, deleteContactsRequestSchema } from "#entities/contact.js";
import {
  createGroupSchema,
  deleteGroupsRequestSchema,
  updateGroupSchema,
} from "#entities/group.js";
import { instagramImportCommitRequestSchema } from "#entities/import.js";
import { importantDateSheetSchema } from "#entities/important-date.js";
import {
  mergeContactsRequestSchema,
  mergeRecommendationSchema,
  mergeRecommendationsResponseSchema,
} from "#entities/merge.js";
import { subscriptionStatusSchema } from "#entities/subscription.js";
import { createTagSchema, deleteTagsRequestSchema, updateTagSchema } from "#entities/tag.js";
import { paginationQuerySchema } from "#http/index.js";
import { EXAMPLE_MERGE_RECOMMENDATION, EXAMPLE_PAGINATION } from "#openapi/fixtures/index.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} (expected: ${String(expected)}, actual: ${String(actual)})`);
  }
}

function run() {
  // contactPreviewSchema shape contract
  const preview = contactPreviewSchema.parse({
    avatar: null,
    firstName: "Ada",
    id: "contact-1",
    ignored: "value",
    lastName: "Lovelace",
  });
  assertEqual(Object.keys(preview).length, 4, "contactPreviewSchema should expose only 4 fields");
  assert("id" in preview && "firstName" in preview, "contactPreviewSchema should keep core fields");

  // group/tag create/update contracts
  const groupCreate = createGroupSchema.parse({
    color: "#ABCDEF",
    emoji: "👋",
    label: "Friends",
  });
  assertEqual(groupCreate.color, "#abcdef", "createGroupSchema should normalize hex color");
  const groupUpdate = updateGroupSchema.parse({
    label: "Inner Circle",
  });
  assert(groupUpdate.label === "Inner Circle", "updateGroupSchema should allow partial payloads");

  const tagCreate = createTagSchema.parse({
    color: "00FF00",
    label: "VIP",
  });
  assertEqual(tagCreate.color, "#00ff00", "createTagSchema should normalize hex color");
  const tagUpdate = updateTagSchema.parse({
    color: "#123456",
  });
  assertEqual(tagUpdate.color, "#123456", "updateTagSchema should keep provided update fields");

  // important-date sheet transform contract
  const sheetNone = importantDateSheetSchema.parse({
    date: "2025-01-01",
    note: "   ",
    notifyDaysBefore: "none",
    type: "birthday",
  });
  assertEqual(sheetNone.note, null, "importantDateSheetSchema should normalize blank note to null");
  assertEqual(
    sheetNone.notifyDaysBefore,
    null,
    "importantDateSheetSchema should normalize 'none' notify value to null",
  );

  const sheetThree = importantDateSheetSchema.parse({
    date: "2024-12-12",
    note: "Dinner",
    notifyDaysBefore: "3",
    type: "anniversary",
  });
  assertEqual(
    sheetThree.notifyDaysBefore,
    3,
    "importantDateSheetSchema should convert notifyDaysBefore to numeric union",
  );

  // ids/delete union contracts
  const deleteByIds = deleteContactsRequestSchema.parse({
    ids: [EXAMPLE_CONTACT_ID, "6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
  });
  assert("ids" in deleteByIds, "deleteContactsRequestSchema should accept ids variant");

  const deleteByFilter = deleteContactsRequestSchema.parse({
    filter: { search: "Ada", sort: "nameAsc" },
  });
  assert("filter" in deleteByFilter, "deleteContactsRequestSchema should accept filter variant");

  const deleteGroups = deleteGroupsRequestSchema.parse({
    ids: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
  });
  assertEqual(deleteGroups.ids.length, 1, "deleteGroupsRequestSchema should parse ids payload");

  const deleteTags = deleteTagsRequestSchema.parse({
    ids: [EXAMPLE_CONTACT_ID, "6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
  });
  assertEqual(deleteTags.ids.length, 2, "deleteTagsRequestSchema should parse ids payload");

  // interaction + participant contract
  const interactionCreate = createInteractionInputSchema.parse({
    date: "2026-01-01T12:00:00.000Z",
    description: "Quick catch-up",
    participantIds: ["p-1"],
    title: "Coffee",
    type: "Coffee",
  });
  assertEqual(
    interactionCreate.participantIds.length,
    1,
    "createInteractionInputSchema should parse participants",
  );

  const participant = interactionParticipantSchema.parse({
    avatar: null,
    firstName: "Ada",
    id: "p-1",
    lastName: "Lovelace",
  });
  assertEqual(participant.firstName, "Ada", "interactionParticipantSchema should use camelCase");

  // subscription dto contract
  const subscriptionStatus = subscriptionStatusSchema.parse({
    aiMessageLimit: 100,
    aiMessagesUsed: 2,
    aiMonthlyResetAt: null,
    amount: 20,
    cancelAtPeriodEnd: false,
    canUseChat: true,
    currency: "USD",
    currentPeriodEnd: null,
    plan: "premium",
    polarStatus: "active",
    productName: "Premium",
    recurringInterval: "month",
    trialEndsAt: null,
  });
  assertEqual(subscriptionStatus.plan, "premium", "subscriptionStatusSchema should parse dto");

  // merge contracts
  const mergeRequest = mergeContactsRequestSchema.parse({
    conflictResolutions: { firstName: "left", linkedin: "right" },
    leftPersonId: "left",
    rightPersonId: "right",
  });
  assertEqual(
    mergeRequest.conflictResolutions?.firstName,
    "left",
    "mergeContactsRequestSchema should parse conflict map",
  );

  const mergeRecommendation = mergeRecommendationSchema.parse(EXAMPLE_MERGE_RECOMMENDATION);
  assertEqual(mergeRecommendation.reasons[0], "fullName", "mergeRecommendationSchema should parse");

  const mergeResponse = mergeRecommendationsResponseSchema.parse({
    pagination: EXAMPLE_PAGINATION,
    recommendations: [mergeRecommendation],
  });
  assertEqual(
    mergeResponse.recommendations.length,
    1,
    "mergeRecommendationsResponseSchema should parse list",
  );

  // import commit contract
  const importCommit = instagramImportCommitRequestSchema.parse({
    contacts: [
      {
        alreadyExists: false,
        connectedAt: null,
        connectedOnRaw: null,
        firstName: "Ada",
        instagramUrl: "https://instagram.com/ada",
        instagramUsername: "ada",
        issues: [],
        isValid: true,
        lastName: "Lovelace",
        likelyPerson: true,
        middleName: null,
        sources: ["following"],
        tempId: "tmp-1",
      },
    ],
  });
  assertEqual(
    importCommit.contacts[0].instagramUsername,
    "ada",
    "instagramImportCommitRequestSchema should parse contacts",
  );

  // HTTP pagination query coercion
  const paginationDefaults = paginationQuerySchema.parse({});
  assertEqual(paginationDefaults.limit, 50, "paginationQuerySchema default limit");
  assertEqual(paginationDefaults.offset, 0, "paginationQuerySchema default offset");

  const paginationCoerced = paginationQuerySchema.parse({ limit: "25", offset: "10" });
  assertEqual(paginationCoerced.limit, 25, "paginationQuerySchema coerces limit");
  assertEqual(paginationCoerced.offset, 10, "paginationQuerySchema coerces offset");
}

run();
