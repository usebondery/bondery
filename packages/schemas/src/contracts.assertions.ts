import { createInteractionInputSchema, interactionParticipantSchema } from "./entities/activity.js";
import { contactPreviewSchema, deleteContactsRequestSchema } from "./entities/contact.js";
import {
  createGroupSchema,
  deleteGroupsRequestSchema,
  updateGroupSchema,
} from "./entities/group.js";
import { importantDateSheetSchema } from "./entities/important-date.js";
import { instagramImportCommitRequestSchema } from "./entities/import.js";
import {
  mergeContactsRequestSchema,
  mergeRecommendationSchema,
  mergeRecommendationsResponseSchema,
} from "./entities/merge.js";
import { subscriptionStatusSchema } from "./entities/subscription.js";
import { createTagSchema, deleteTagsRequestSchema, updateTagSchema } from "./entities/tag.js";

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
    id: "contact-1",
    firstName: "Ada",
    lastName: "Lovelace",
    avatar: null,
    ignored: "value",
  });
  assertEqual(Object.keys(preview).length, 4, "contactPreviewSchema should expose only 4 fields");
  assert("id" in preview && "firstName" in preview, "contactPreviewSchema should keep core fields");

  // group/tag create/update contracts
  const groupCreate = createGroupSchema.parse({
    label: "Friends",
    emoji: "👋",
    color: "#ABCDEF",
  });
  assertEqual(groupCreate.color, "#abcdef", "createGroupSchema should normalize hex color");
  const groupUpdate = updateGroupSchema.parse({
    label: "Inner Circle",
  });
  assert(groupUpdate.label === "Inner Circle", "updateGroupSchema should allow partial payloads");

  const tagCreate = createTagSchema.parse({
    label: "VIP",
    color: "00FF00",
  });
  assertEqual(tagCreate.color, "#00ff00", "createTagSchema should normalize hex color");
  const tagUpdate = updateTagSchema.parse({
    color: "#123456",
  });
  assertEqual(tagUpdate.color, "#123456", "updateTagSchema should keep provided update fields");

  // important-date sheet transform contract
  const sheetNone = importantDateSheetSchema.parse({
    type: "birthday",
    date: "2025-01-01",
    note: "   ",
    notifyDaysBefore: "none",
  });
  assertEqual(sheetNone.note, null, "importantDateSheetSchema should normalize blank note to null");
  assertEqual(
    sheetNone.notifyDaysBefore,
    null,
    "importantDateSheetSchema should normalize 'none' notify value to null",
  );

  const sheetThree = importantDateSheetSchema.parse({
    type: "anniversary",
    date: "2024-12-12",
    note: "Dinner",
    notifyDaysBefore: "3",
  });
  assertEqual(
    sheetThree.notifyDaysBefore,
    3,
    "importantDateSheetSchema should convert notifyDaysBefore to numeric union",
  );

  // ids/delete union contracts
  const deleteByIds = deleteContactsRequestSchema.parse({
    ids: ["1", "2"],
  });
  assert("ids" in deleteByIds, "deleteContactsRequestSchema should accept ids variant");

  const deleteByFilter = deleteContactsRequestSchema.parse({
    filter: { q: "Ada", sort: "nameAsc" },
  });
  assert("filter" in deleteByFilter, "deleteContactsRequestSchema should accept filter variant");

  const deleteGroups = deleteGroupsRequestSchema.parse({ ids: ["g-1"] });
  assertEqual(deleteGroups.ids.length, 1, "deleteGroupsRequestSchema should parse ids payload");

  const deleteTags = deleteTagsRequestSchema.parse({ ids: ["t-1", "t-2"] });
  assertEqual(deleteTags.ids.length, 2, "deleteTagsRequestSchema should parse ids payload");

  // interaction + participant contract
  const interactionCreate = createInteractionInputSchema.parse({
    title: "Coffee",
    type: "Coffee",
    description: "Quick catch-up",
    date: "2026-01-01T12:00:00.000Z",
    participantIds: ["p-1"],
  });
  assertEqual(
    interactionCreate.participantIds.length,
    1,
    "createInteractionInputSchema should parse participants",
  );

  const participant = interactionParticipantSchema.parse({
    id: "p-1",
    first_name: "Ada",
    last_name: "Lovelace",
    avatar: null,
  });
  assertEqual(participant.first_name, "Ada", "interactionParticipantSchema should keep snake_case");

  // subscription dto contract
  const subscriptionStatus = subscriptionStatusSchema.parse({
    plan: "premium",
    aiMessagesUsed: 2,
    aiMessageLimit: 100,
    aiMonthlyResetAt: null,
    canUseChat: true,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    polarStatus: "active",
    trialEndsAt: null,
    amount: 20,
    currency: "USD",
    productName: "Premium",
    recurringInterval: "month",
  });
  assertEqual(subscriptionStatus.plan, "premium", "subscriptionStatusSchema should parse dto");

  // merge contracts
  const mergeRequest = mergeContactsRequestSchema.parse({
    leftPersonId: "left",
    rightPersonId: "right",
    conflictResolutions: { firstName: "left", linkedin: "right" },
  });
  assertEqual(
    mergeRequest.conflictResolutions?.firstName,
    "left",
    "mergeContactsRequestSchema should parse conflict map",
  );

  const mergeRecommendation = mergeRecommendationSchema.parse({
    id: "mr-1",
    leftPerson: {
      id: "left",
      userId: "user",
      firstName: "Ada",
      middleName: null,
      lastName: "Lovelace",
      headline: null,
      location: null,
      notes: null,
      avatar: null,
      lastInteraction: null,
      lastInteractionActivityId: null,
      keepFrequencyDays: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      phones: [],
      emails: [],
      linkedin: null,
      instagram: null,
      whatsapp: null,
      facebook: null,
      website: null,
      signal: null,
      myself: null,
      language: null,
      timezone: null,
      gisPoint: null,
      latitude: null,
      longitude: null,
    },
    rightPerson: {
      id: "right",
      userId: "user",
      firstName: "Ada",
      middleName: null,
      lastName: "Lovelace",
      headline: null,
      location: null,
      notes: null,
      avatar: null,
      lastInteraction: null,
      lastInteractionActivityId: null,
      keepFrequencyDays: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      phones: [],
      emails: [],
      linkedin: null,
      instagram: null,
      whatsapp: null,
      facebook: null,
      website: null,
      signal: null,
      myself: null,
      language: null,
      timezone: null,
      gisPoint: null,
      latitude: null,
      longitude: null,
    },
    score: 0.95,
    reasons: ["fullName"],
  });
  assertEqual(mergeRecommendation.reasons[0], "fullName", "mergeRecommendationSchema should parse");

  const mergeResponse = mergeRecommendationsResponseSchema.parse({
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
        tempId: "tmp-1",
        firstName: "Ada",
        middleName: null,
        lastName: "Lovelace",
        instagramUrl: "https://instagram.com/ada",
        instagramUsername: "ada",
        alreadyExists: false,
        likelyPerson: true,
        connectedAt: null,
        connectedOnRaw: null,
        sources: ["following"],
        isValid: true,
        issues: [],
      },
    ],
  });
  assertEqual(
    importCommit.contacts[0].instagramUsername,
    "ada",
    "instagramImportCommitRequestSchema should parse contacts",
  );
}

run();
