import {
  EXAMPLE_API_KEY_LIST_ITEM,
  EXAMPLE_CHAT_MESSAGE,
  EXAMPLE_CHAT_SESSION,
  EXAMPLE_CONTACT,
  EXAMPLE_CONTACT_LIST_ITEM,
  EXAMPLE_CONTACT_PREVIEW,
  EXAMPLE_CONTACT_SELECTABLE,
  EXAMPLE_GEOCODE_ADDRESS,
  EXAMPLE_GROUP,
  EXAMPLE_GROUP_WITH_COUNT,
  EXAMPLE_IMPORTANT_DATE,
  EXAMPLE_INSTAGRAM_PREPARED_CONTACT,
  EXAMPLE_INTERACTION,
  EXAMPLE_LINKEDIN_PREPARED_CONTACT,
  EXAMPLE_MERGE_RECOMMENDATION,
  EXAMPLE_RELATIONSHIP,
  EXAMPLE_RELATIONSHIP_WITH_PEOPLE,
  EXAMPLE_SUBSCRIPTION_STATUS,
  EXAMPLE_TAG,
  EXAMPLE_TAG_WITH_COUNT,
  EXAMPLE_USER_SESSION,
  EXAMPLE_USER_SETTINGS,
  EXAMPLE_VCARD_PREPARED_CONTACT,
} from "./entities.js";
import {
  EXAMPLE_CONTACT_ID,
  EXAMPLE_CONTACT_ID_2,
  EXAMPLE_DATE,
  EXAMPLE_ISO_TIMESTAMP,
  EXAMPLE_PAGINATION,
  EXAMPLE_USER_ID,
} from "./primitives.js";

/** Small example objects for Zod `.meta({ example })` on entity/http/sync schemas. */
export const EXAMPLE_MESSAGE_RESPONSE = { message: "OK" };

export const EXAMPLE_DELETE_CONTACT_RESPONSE = EXAMPLE_MESSAGE_RESPONSE;

export const EXAMPLE_API_SUCCESS_RESPONSE = { message: "Operation completed", success: true };

export const EXAMPLE_WEBHOOK_ACK_RESPONSE = { received: true };

export const EXAMPLE_CONTACT_RESPONSE = { contact: EXAMPLE_CONTACT };

export const EXAMPLE_CREATE_CONTACT_RESPONSE = {
  contact: EXAMPLE_CONTACT,
  txid: "tx-550e8400-e29b-41d4-a716-446655440000",
};

export const EXAMPLE_CONTACTS_LIST_RESPONSE = {
  contacts: [EXAMPLE_CONTACT_LIST_ITEM],
  pagination: EXAMPLE_PAGINATION,
  stats: {
    newContactsThisYear: 22,
    thisMonthInteractions: 14,
    totalContacts: 128,
  },
};

export const EXAMPLE_CONTACTS_SELECTABLE_LIST_RESPONSE = {
  contacts: [EXAMPLE_CONTACT_SELECTABLE],
  pagination: EXAMPLE_PAGINATION,
};

export const EXAMPLE_MAP_PINS_RESPONSE = {
  pins: [
    {
      avatar: null,
      firstName: "Ada",
      headline: "Mathematician",
      id: EXAMPLE_CONTACT_ID,
      lastInteraction: EXAMPLE_ISO_TIMESTAMP,
      lastName: "Lovelace",
      latitude: 51.5074,
      location: "London, UK",
      longitude: -0.1278,
    },
  ],
};

export const EXAMPLE_MAP_ADDRESS_PINS_RESPONSE = {
  pins: [
    {
      addressCity: "London",
      addressCountry: "United Kingdom",
      addressFormatted: "London, UK",
      addressId: "addr-1",
      addressType: "home",
      avatar: null,
      firstName: "Ada",
      lastName: "Lovelace",
      latitude: 51.5074,
      longitude: -0.1278,
      personId: EXAMPLE_CONTACT_ID,
    },
  ],
};

export const EXAMPLE_CONTACT_RELATIONSHIPS_RESPONSE = {
  relationships: [EXAMPLE_RELATIONSHIP_WITH_PEOPLE],
};

export const EXAMPLE_CONTACT_RELATIONSHIP_RESPONSE = {
  relationship: EXAMPLE_RELATIONSHIP,
};

export const EXAMPLE_DELETE_CONTACTS_RESPONSE = {
  deletedCount: 3,
  message: "Contacts deleted",
};

export const EXAMPLE_BY_SOCIAL_LOOKUP_RESPONSE = {
  contact: EXAMPLE_CONTACT_PREVIEW,
  exists: true,
};

export const EXAMPLE_LINKEDIN_DATA_RESPONSE = {
  education: [],
  linkedinBio: "Mathematician and writer.",
  syncedAt: EXAMPLE_ISO_TIMESTAMP,
  workHistory: [],
};

export const EXAMPLE_ENRICH_ELIGIBLE_COUNT_RESPONSE = { count: 42 };

export const EXAMPLE_ENRICH_QUEUE_COUNT_RESPONSE = { eligibleCount: 42 };

export const EXAMPLE_MERGE_RECOMMENDATIONS_COUNT_RESPONSE = { activeCount: 3 };

export const EXAMPLE_KEEP_IN_TOUCH_COUNT_RESPONSE = { overdueCount: 2 };

export const EXAMPLE_ENRICH_QUEUE_STATUS_COUNTS_RESPONSE = {
  completed: 12,
  failed: 1,
  pending: 5,
};

export const EXAMPLE_ENRICH_QUEUE_INIT_RESPONSE = { totalEligible: 42 };

export const EXAMPLE_ENRICH_QUEUE_NEXT_BATCH_RESPONSE = {
  items: [
    {
      firstName: "Ada",
      lastName: "Lovelace",
      linkedinHandle: "ada-lovelace",
      personId: EXAMPLE_CONTACT_ID,
      queueItemId: "queue-1",
    },
  ],
};

export const EXAMPLE_LINKEDIN_DATA_UPSERT_RESPONSE = { count: 3, success: true };

export const EXAMPLE_MERGE_CONTACTS_RESPONSE = {
  contact: EXAMPLE_CONTACT,
  mergedFromPersonId: EXAMPLE_CONTACT_ID_2,
  mergedIntoPersonId: EXAMPLE_CONTACT_ID,
  personId: EXAMPLE_CONTACT_ID,
  userId: EXAMPLE_USER_ID,
};

export const EXAMPLE_MERGE_RECOMMENDATIONS_RESPONSE = {
  pagination: EXAMPLE_PAGINATION,
  recommendations: [EXAMPLE_MERGE_RECOMMENDATION],
};

export const EXAMPLE_DECLINE_MERGE_RECOMMENDATION_RESPONSE = { success: true };

export const EXAMPLE_REFRESH_MERGE_RECOMMENDATIONS_RESPONSE = {
  recommendations: [EXAMPLE_MERGE_RECOMMENDATION],
  recommendationsCount: 1,
  success: true,
};

export const EXAMPLE_GROUPS_LIST_RESPONSE = {
  groups: [EXAMPLE_GROUP_WITH_COUNT],
  totalCount: 1,
};

export const EXAMPLE_GROUP_RESPONSE = { group: EXAMPLE_GROUP };

export const EXAMPLE_GROUP_CONTACTS_LIST_RESPONSE = {
  contacts: [EXAMPLE_CONTACT_LIST_ITEM],
  group: { id: EXAMPLE_GROUP.id, label: EXAMPLE_GROUP.label },
  pagination: EXAMPLE_PAGINATION,
};

export const EXAMPLE_ADD_CONTACTS_TO_GROUP_RESPONSE = {
  addedCount: 3,
  message: "Contacts added to group",
  skippedCount: 1,
};

export const EXAMPLE_REMOVE_GROUP_MEMBERS_RESPONSE = {
  message: "Members removed from group",
  removedCount: 2,
};

export const EXAMPLE_CONTACT_GROUPS_RESPONSE = {
  groups: [EXAMPLE_GROUP_WITH_COUNT],
};

export const EXAMPLE_TAGS_LIST_RESPONSE = {
  tags: [EXAMPLE_TAG_WITH_COUNT],
  totalCount: 1,
};

export const EXAMPLE_TAG_RESPONSE = { tag: EXAMPLE_TAG };

export const EXAMPLE_TAG_UPDATE_RESPONSE = { tag: EXAMPLE_TAG };

export const EXAMPLE_ADD_CONTACTS_TO_TAG_RESPONSE = {
  addedCount: 3,
};

export const EXAMPLE_REMOVE_CONTACTS_FROM_TAG_RESPONSE = {
  removedCount: 2,
};

export const EXAMPLE_TAG_MEMBERS_LIST_RESPONSE = {
  contacts: [EXAMPLE_CONTACT_PREVIEW],
  pagination: EXAMPLE_PAGINATION,
};

export const EXAMPLE_CONTACT_TAG_LIST_RESPONSE = {
  tags: [EXAMPLE_TAG],
};

export const EXAMPLE_INTERACTIONS_LIST_RESPONSE = {
  interactions: [EXAMPLE_INTERACTION],
  pagination: EXAMPLE_PAGINATION,
};

export const EXAMPLE_INTERACTION_RESPONSE = {
  interaction: {
    createdAt: EXAMPLE_INTERACTION.createdAt,
    date: EXAMPLE_INTERACTION.date,
    description: EXAMPLE_INTERACTION.description,
    id: EXAMPLE_INTERACTION.id,
    participants: EXAMPLE_INTERACTION.participants,
    title: EXAMPLE_INTERACTION.title,
    type: EXAMPLE_INTERACTION.type,
    updatedAt: EXAMPLE_INTERACTION.updatedAt,
  },
};

export const EXAMPLE_IMPORTANT_DATES_LIST_RESPONSE = {
  dates: [EXAMPLE_IMPORTANT_DATE],
};

export const EXAMPLE_UPCOMING_REMINDERS_RESPONSE = {
  reminders: [
    {
      importantDate: EXAMPLE_IMPORTANT_DATE,
      notificationSent: false,
      notificationSentAt: null,
      person: EXAMPLE_CONTACT_PREVIEW,
    },
  ],
};

export const EXAMPLE_REMINDER_DIGEST_RESPONSE = {
  failedUsers: 0,
  sentUsers: 10,
  success: true,
  targetDate: EXAMPLE_DATE,
};

export const EXAMPLE_VCARD_EXPORT =
  "BEGIN:VCARD\nVERSION:3.0\nFN:Ada Lovelace\nN:Lovelace;Ada;;;\nEMAIL:ada@example.com\nEND:VCARD\n";

export const EXAMPLE_REDIRECT_RESPONSE = {
  contact: EXAMPLE_CONTACT,
  existed: false,
};

export const EXAMPLE_LINKEDIN_PARSE_RESPONSE = {
  contacts: [EXAMPLE_LINKEDIN_PREPARED_CONTACT],
  invalidCount: 0,
  totalCount: 1,
  validCount: 1,
};

export const EXAMPLE_LINKEDIN_IMPORT_COMMIT_RESPONSE = {
  importedCount: 5,
  skippedCount: 1,
  updatedCount: 2,
};

export const EXAMPLE_INSTAGRAM_PARSE_RESPONSE = {
  contacts: [EXAMPLE_INSTAGRAM_PREPARED_CONTACT],
  invalidCount: 0,
  totalCount: 1,
  validCount: 1,
};

export const EXAMPLE_INSTAGRAM_IMPORT_COMMIT_RESPONSE = {
  importedCount: 8,
  skippedCount: 2,
  updatedCount: 0,
};

export const EXAMPLE_VCARD_PARSE_RESPONSE = {
  contacts: [EXAMPLE_VCARD_PREPARED_CONTACT],
  invalidCount: 0,
  totalCount: 1,
  validCount: 1,
};

export const EXAMPLE_VCARD_IMPORT_COMMIT_RESPONSE = {
  importedCount: 12,
  skippedCount: 0,
};

export const EXAMPLE_SYNC_PULL_RESPONSE = {
  batches: [
    {
      changes: [
        {
          entityId: EXAMPLE_CONTACT_ID,
          operation: "update" as const,
          table: "people",
          value: { first_name: "Ada" },
        },
      ],
      serverSequence: 1,
    },
  ],
  nextServerSequence: 2,
};

export const EXAMPLE_SYNC_BOOTSTRAP_RESPONSE = {
  nextServerSequence: 1,
  tables: {
    groups: [],
    people: [{ first_name: "Ada", id: EXAMPLE_CONTACT_ID, last_name: "Lovelace" }],
    people_addresses: [],
    people_emails: [],
    people_groups: [],
    people_important_dates: [],
    people_phones: [],
    people_socials: [],
    people_tags: [],
    tags: [],
  },
};

export const EXAMPLE_SYNC_PUSH_RESPONSE = {
  nextServerSequence: 4,
  results: [
    {
      data: { contact: EXAMPLE_CONTACT },
      id: EXAMPLE_CONTACT_ID,
      serverSequence: 3,
      status: "applied" as const,
      txid: "tx-1",
    },
  ],
  serverTime: EXAMPLE_ISO_TIMESTAMP,
};

export const EXAMPLE_USER_SESSION_RESPONSE = {
  data: EXAMPLE_USER_SESSION,
  success: true as const,
};

export const EXAMPLE_USER_SETTINGS_RESPONSE = {
  data: EXAMPLE_USER_SETTINGS,
  success: true,
};

export const EXAMPLE_USER_ACCOUNT_RESPONSE = {
  data: {
    email: "ada@example.com",
    id: EXAMPLE_USER_ID,
    user_metadata: {
      avatar_url: null,
      name: "Ada",
      surname: "Lovelace",
    },
  },
  success: true,
};

export const EXAMPLE_API_KEYS_LIST_RESPONSE = {
  apiKeys: [EXAMPLE_API_KEY_LIST_ITEM],
  totalCount: 1,
};

export const EXAMPLE_API_KEY_CREATED_RESPONSE = {
  ...EXAMPLE_API_KEY_LIST_ITEM,
  secret: "bondery_key_dd0e8400_secret_example",
};

export const EXAMPLE_PHOTO_UPLOAD_RESPONSE = {
  avatarUrl: "https://cdn.example.com/avatars/ada.jpg",
  success: true,
};

export const EXAMPLE_GEOCODE_SUGGEST_RESPONSE = {
  addresses: [EXAMPLE_GEOCODE_ADDRESS],
};

export const EXAMPLE_GEOCODE_TIMEZONE_RESPONSE = {
  timezone: "Europe/London",
};

export const EXAMPLE_CHAT_SESSIONS_LIST_RESPONSE = {
  pagination: EXAMPLE_PAGINATION,
  sessions: [EXAMPLE_CHAT_SESSION],
};

export const EXAMPLE_CHAT_MESSAGES_LIST_RESPONSE = {
  messages: [EXAMPLE_CHAT_MESSAGE],
  pagination: EXAMPLE_PAGINATION,
};

export const EXAMPLE_CHAT_SESSION_CREATED_RESPONSE = {
  session: EXAMPLE_CHAT_SESSION,
};

export const EXAMPLE_SUBSCRIPTION_STATUS_RESPONSE = {
  data: EXAMPLE_SUBSCRIPTION_STATUS,
  success: true,
};

export const EXAMPLE_CHECKOUT_RESPONSE = {
  url: "https://checkout.polar.sh/session/example",
};

export const EXAMPLE_SUBSCRIPTION_SYNC_SUCCESS_RESPONSE = {
  source: "polar_api" as const,
  synced: true as const,
};

export const EXAMPLE_SUBSCRIPTION_SYNC_SKIPPED_RESPONSE = {
  reason: "already_active",
  synced: false as const,
};

export const EXAMPLE_PROFILE_PHOTO_RESPONSE = {
  data: { avatarUrl: "https://cdn.example.com/avatars/profile.jpg" },
  success: true,
};

export const EXAMPLE_SETTINGS_PATCH_RESPONSE = {
  data: {
    colorScheme: "auto",
    groupSortOrder: "alpha-asc",
    language: "en",
    leftSwipeAction: "call",
    reminderSendHour: "09:00",
    rightSwipeAction: "email",
    tagSortOrder: "count-desc",
    timeFormat: "24h",
    timezone: "Europe/London",
  },
  success: true,
};

export const EXAMPLE_ACTIVE_USERS_RESPONSE = {
  timeline: [{ date: EXAMPLE_DATE, dau: 120, mau: 1200, wau: 450 }],
};

export const EXAMPLE_FUNNEL_RESPONSE = {
  periods: [
    {
      contacts: 40,
      contactsToInteractionsPct: 62.5,
      interactions: 25,
      periodKey: "2026-01",
      periodLabel: "Jan 2026",
      signups: 50,
      signupsToContactsPct: 80,
    },
  ],
};

export const EXAMPLE_NPS_RESPONSE = {
  detractors: 3,
  passives: 4,
  promoters: 18,
  responses: 25,
  score: 72,
};

export const EXAMPLE_TOTAL_USERS_RESPONSE = {
  timeline: [{ date: EXAMPLE_DATE, total: 1500 }],
};

export const EXAMPLE_GITHUB_STARS_RESPONSE = {
  repo: "bondery/bondery",
  stars: 420,
};

export const EXAMPLE_LIVENESS_STATUS_RESPONSE = {
  extension: {
    minVersion: "1.0.0",
    storeUrl: "https://chrome.google.com/webstore/detail/bondery/example",
  },
  status: "ok" as const,
  timestamp: EXAMPLE_ISO_TIMESTAMP,
};

export const EXAMPLE_HEALTH_OK_RESPONSE = {
  cached: false,
  cacheExpiresAt: EXAMPLE_ISO_TIMESTAMP,
  services: {
    anthropic: { configured: true, ok: true },
    mapy: { configured: true, ok: true },
    polar: { configured: true, ok: true },
    posthog: { configured: true, ok: true },
    redis: { latencyMs: 2, ok: true },
    smtp: { configured: true, ok: true },
    supabase: {
      auth: { latencyMs: 12, ok: true },
      database: { latencyMs: 18, ok: true },
      storage: { latencyMs: 15, ok: true },
    },
  },
  status: "ok" as const,
  timestamp: EXAMPLE_ISO_TIMESTAMP,
};

export const EXAMPLE_HEALTH_UNHEALTHY_RESPONSE = {
  ...EXAMPLE_HEALTH_OK_RESPONSE,
  services: {
    ...EXAMPLE_HEALTH_OK_RESPONSE.services,
    supabase: {
      auth: { error: "Connection refused", ok: false },
      database: { error: "Connection refused", ok: false },
      storage: { error: "Connection refused", ok: false },
    },
  },
  status: "unhealthy" as const,
};
