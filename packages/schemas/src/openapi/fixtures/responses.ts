import {
  EXAMPLE_API_KEY_LIST_ITEM,
  EXAMPLE_CHAT_MESSAGE,
  EXAMPLE_CHAT_SESSION,
  EXAMPLE_CONTACT,
  EXAMPLE_CONTACT_DUPLICATE,
  EXAMPLE_CONTACT_PREVIEW,
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

export const EXAMPLE_MESSAGE_RESPONSE = { message: "OK" };

export const EXAMPLE_DELETE_CONTACT_RESPONSE = EXAMPLE_MESSAGE_RESPONSE;

export const EXAMPLE_API_SUCCESS_RESPONSE = { success: true, message: "Operation completed" };

export const EXAMPLE_WEBHOOK_ACK_RESPONSE = { received: true };

export const EXAMPLE_CONTACT_RESPONSE = { contact: EXAMPLE_CONTACT };

export const EXAMPLE_CREATE_CONTACT_RESPONSE = {
  contact: EXAMPLE_CONTACT,
  txid: "tx-550e8400-e29b-41d4-a716-446655440000",
};

export const EXAMPLE_CONTACTS_LIST_RESPONSE = {
  contacts: [EXAMPLE_CONTACT],
  pagination: EXAMPLE_PAGINATION,
  stats: {
    totalContacts: 128,
    thisMonthInteractions: 14,
    newContactsThisYear: 22,
  },
};

export const EXAMPLE_MAP_PINS_RESPONSE = {
  pins: [
    {
      id: EXAMPLE_CONTACT_ID,
      firstName: "Ada",
      lastName: "Lovelace",
      headline: "Mathematician",
      location: "London, UK",
      lastInteraction: EXAMPLE_ISO_TIMESTAMP,
      latitude: 51.5074,
      longitude: -0.1278,
      avatar: null,
    },
  ],
};

export const EXAMPLE_MAP_ADDRESS_PINS_RESPONSE = {
  pins: [
    {
      addressId: "addr-1",
      personId: EXAMPLE_CONTACT_ID,
      firstName: "Ada",
      lastName: "Lovelace",
      addressType: "home",
      addressFormatted: "London, UK",
      addressCity: "London",
      addressCountry: "United Kingdom",
      latitude: 51.5074,
      longitude: -0.1278,
      avatar: null,
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
  message: "Contacts deleted",
  deletedCount: 3,
};

export const EXAMPLE_BY_SOCIAL_LOOKUP_RESPONSE = {
  exists: true,
  contact: EXAMPLE_CONTACT_PREVIEW,
};

export const EXAMPLE_LINKEDIN_DATA_RESPONSE = {
  linkedinBio: "Mathematician and writer.",
  syncedAt: EXAMPLE_ISO_TIMESTAMP,
  workHistory: [],
  education: [],
};

export const EXAMPLE_ENRICH_ELIGIBLE_COUNT_RESPONSE = { count: 42 };

export const EXAMPLE_ENRICH_QUEUE_STATUS_COUNTS_RESPONSE = {
  pending: 5,
  completed: 12,
  failed: 1,
};

export const EXAMPLE_ENRICH_QUEUE_INIT_RESPONSE = { totalEligible: 42 };

export const EXAMPLE_ENRICH_QUEUE_NEXT_BATCH_RESPONSE = {
  items: [
    {
      queueItemId: "queue-1",
      personId: EXAMPLE_CONTACT_ID,
      linkedinHandle: "ada-lovelace",
      firstName: "Ada",
      lastName: "Lovelace",
    },
  ],
};

export const EXAMPLE_LINKEDIN_DATA_UPSERT_RESPONSE = { success: true, count: 3 };

export const EXAMPLE_MERGE_CONTACTS_RESPONSE = {
  personId: EXAMPLE_CONTACT_ID,
  userId: EXAMPLE_USER_ID,
  mergedIntoPersonId: EXAMPLE_CONTACT_ID,
  mergedFromPersonId: EXAMPLE_CONTACT_ID_2,
  contact: EXAMPLE_CONTACT,
};

export const EXAMPLE_MERGE_RECOMMENDATIONS_RESPONSE = {
  recommendations: [EXAMPLE_MERGE_RECOMMENDATION],
  pagination: EXAMPLE_PAGINATION,
};

export const EXAMPLE_DECLINE_MERGE_RECOMMENDATION_RESPONSE = { success: true };

export const EXAMPLE_REFRESH_MERGE_RECOMMENDATIONS_RESPONSE = {
  success: true,
  recommendationsCount: 1,
  recommendations: [EXAMPLE_MERGE_RECOMMENDATION],
};

export const EXAMPLE_GROUPS_LIST_RESPONSE = {
  groups: [EXAMPLE_GROUP_WITH_COUNT],
  totalCount: 1,
};

export const EXAMPLE_GROUP_RESPONSE = { group: EXAMPLE_GROUP };

export const EXAMPLE_GROUP_CONTACTS_LIST_RESPONSE = {
  contacts: [EXAMPLE_CONTACT],
  pagination: EXAMPLE_PAGINATION,
  group: { id: EXAMPLE_GROUP.id, label: EXAMPLE_GROUP.label },
};

export const EXAMPLE_ADD_CONTACTS_TO_GROUP_RESPONSE = {
  message: "Contacts added to group",
  addedCount: 3,
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

export const EXAMPLE_TAG_UPDATE_RESPONSE = {
  message: "Tag updated",
  tag: EXAMPLE_TAG,
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
    id: EXAMPLE_INTERACTION.id,
    title: EXAMPLE_INTERACTION.title,
    type: EXAMPLE_INTERACTION.type,
    description: EXAMPLE_INTERACTION.description,
    date: EXAMPLE_INTERACTION.date,
    createdAt: EXAMPLE_INTERACTION.createdAt,
    updatedAt: EXAMPLE_INTERACTION.updatedAt,
    participants: EXAMPLE_INTERACTION.participants,
  },
};

export const EXAMPLE_IMPORTANT_DATES_LIST_RESPONSE = {
  dates: [EXAMPLE_IMPORTANT_DATE],
};

export const EXAMPLE_UPCOMING_REMINDERS_RESPONSE = {
  reminders: [
    {
      importantDate: EXAMPLE_IMPORTANT_DATE,
      person: EXAMPLE_CONTACT_PREVIEW,
      notificationSent: false,
      notificationSentAt: null,
    },
  ],
};

export const EXAMPLE_REMINDER_DIGEST_RESPONSE = {
  success: true,
  targetDate: EXAMPLE_DATE,
  sentUsers: 10,
  failedUsers: 0,
};

export const EXAMPLE_VCARD_EXPORT =
  "BEGIN:VCARD\nVERSION:3.0\nFN:Ada Lovelace\nN:Lovelace;Ada;;;\nEMAIL:ada@example.com\nEND:VCARD\n";

export const EXAMPLE_REDIRECT_RESPONSE = {
  contactId: EXAMPLE_CONTACT_ID,
  existed: false,
  firstName: "Ada",
  lastName: "Lovelace",
  avatar: null,
};

export const EXAMPLE_LINKEDIN_PARSE_RESPONSE = {
  contacts: [EXAMPLE_LINKEDIN_PREPARED_CONTACT],
  totalCount: 1,
  validCount: 1,
  invalidCount: 0,
};

export const EXAMPLE_LINKEDIN_IMPORT_COMMIT_RESPONSE = {
  importedCount: 5,
  updatedCount: 2,
  skippedCount: 1,
};

export const EXAMPLE_INSTAGRAM_PARSE_RESPONSE = {
  contacts: [EXAMPLE_INSTAGRAM_PREPARED_CONTACT],
  totalCount: 1,
  validCount: 1,
  invalidCount: 0,
};

export const EXAMPLE_INSTAGRAM_IMPORT_COMMIT_RESPONSE = {
  importedCount: 8,
  updatedCount: 0,
  skippedCount: 2,
};

export const EXAMPLE_VCARD_PARSE_RESPONSE = {
  contacts: [EXAMPLE_VCARD_PREPARED_CONTACT],
  totalCount: 1,
  validCount: 1,
  invalidCount: 0,
};

export const EXAMPLE_VCARD_IMPORT_COMMIT_RESPONSE = {
  importedCount: 12,
  skippedCount: 0,
};

export const EXAMPLE_SYNC_PULL_RESPONSE = {
  batches: [
    {
      serverSequence: 1,
      changes: [
        {
          table: "people",
          operation: "update" as const,
          entityId: EXAMPLE_CONTACT_ID,
          value: { first_name: "Ada" },
        },
      ],
    },
  ],
  nextServerSequence: 2,
};

export const EXAMPLE_SYNC_BOOTSTRAP_RESPONSE = {
  tables: {
    people: [{ id: EXAMPLE_CONTACT_ID, first_name: "Ada", last_name: "Lovelace" }],
    people_phones: [],
    people_emails: [],
    people_addresses: [],
    people_socials: [],
    groups: [],
    people_groups: [],
    tags: [],
    people_tags: [],
    people_important_dates: [],
  },
  nextServerSequence: 1,
};

export const EXAMPLE_SYNC_PUSH_RESPONSE = {
  results: [
    {
      id: EXAMPLE_CONTACT_ID,
      status: "applied" as const,
      serverSequence: 3,
      txid: "tx-1",
      data: { contact: EXAMPLE_CONTACT },
    },
  ],
  serverTime: EXAMPLE_ISO_TIMESTAMP,
  nextServerSequence: 4,
};

export const EXAMPLE_USER_SETTINGS_RESPONSE = {
  success: true,
  data: EXAMPLE_USER_SETTINGS,
};

export const EXAMPLE_USER_ACCOUNT_RESPONSE = {
  success: true,
  data: {
    id: EXAMPLE_USER_ID,
    email: "ada@example.com",
    user_metadata: {
      name: "Ada",
      surname: "Lovelace",
      avatar_url: null,
    },
  },
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
  success: true,
  avatarUrl: "https://cdn.example.com/avatars/ada.jpg",
};

export const EXAMPLE_GEOCODE_SUGGEST_RESPONSE = {
  addresses: [EXAMPLE_GEOCODE_ADDRESS],
};

export const EXAMPLE_GEOCODE_TIMEZONE_RESPONSE = {
  timezone: "Europe/London",
};

export const EXAMPLE_CHAT_SESSIONS_LIST_RESPONSE = {
  sessions: [EXAMPLE_CHAT_SESSION],
  pagination: EXAMPLE_PAGINATION,
};

export const EXAMPLE_CHAT_MESSAGES_LIST_RESPONSE = {
  messages: [EXAMPLE_CHAT_MESSAGE],
  pagination: EXAMPLE_PAGINATION,
};

export const EXAMPLE_CHAT_SESSION_CREATED_RESPONSE = {
  data: {
    id: EXAMPLE_CHAT_SESSION.id,
    created_at: EXAMPLE_CHAT_SESSION.created_at,
  },
};

export const EXAMPLE_CHAT_SESSION_LIST_ITEM = {
  id: EXAMPLE_CHAT_SESSION.id,
  title: EXAMPLE_CHAT_SESSION.title,
  created_at: EXAMPLE_CHAT_SESSION.created_at,
  updated_at: EXAMPLE_CHAT_SESSION.updated_at,
};

export const EXAMPLE_CHAT_SESSIONS_WIRE_LIST_RESPONSE = {
  sessions: [EXAMPLE_CHAT_SESSION_LIST_ITEM],
  pagination: EXAMPLE_PAGINATION,
};

export const EXAMPLE_SUBSCRIPTION_STATUS_RESPONSE = {
  success: true,
  data: EXAMPLE_SUBSCRIPTION_STATUS,
};

export const EXAMPLE_CHECKOUT_RESPONSE = {
  url: "https://checkout.polar.sh/session/example",
};

export const EXAMPLE_SUBSCRIPTION_SYNC_SUCCESS_RESPONSE = {
  synced: true as const,
  source: "polar_api" as const,
};

export const EXAMPLE_SUBSCRIPTION_SYNC_SKIPPED_RESPONSE = {
  synced: false as const,
  reason: "already_active",
};

export const EXAMPLE_PROFILE_PHOTO_RESPONSE = {
  success: true,
  data: { avatarUrl: "https://cdn.example.com/avatars/profile.jpg" },
};

export const EXAMPLE_SETTINGS_PATCH_RESPONSE = {
  success: true,
  data: {
    timezone: "Europe/London",
    reminderSendHour: "09:00",
    timeFormat: "24h",
    language: "en",
    colorScheme: "auto",
    leftSwipeAction: "call",
    rightSwipeAction: "email",
    groupSortOrder: "alpha-asc",
    tagSortOrder: "count-desc",
  },
};

export const EXAMPLE_ACTIVE_USERS_RESPONSE = {
  timeline: [{ date: EXAMPLE_DATE, dau: 120, wau: 450, mau: 1200 }],
};

export const EXAMPLE_FUNNEL_RESPONSE = {
  periods: [
    {
      periodKey: "2026-01",
      periodLabel: "Jan 2026",
      signups: 50,
      contacts: 40,
      interactions: 25,
      signupsToContactsPct: 80,
      contactsToInteractionsPct: 62.5,
    },
  ],
};

export const EXAMPLE_NPS_RESPONSE = {
  score: 72,
  responses: 25,
  promoters: 18,
  passives: 4,
  detractors: 3,
};

export const EXAMPLE_TOTAL_USERS_RESPONSE = {
  timeline: [{ date: EXAMPLE_DATE, total: 1500 }],
};

export const EXAMPLE_GITHUB_STARS_RESPONSE = {
  stars: 420,
  repo: "bondery/bondery",
};

export const EXAMPLE_LIVENESS_STATUS_RESPONSE = {
  status: "ok" as const,
  timestamp: EXAMPLE_ISO_TIMESTAMP,
  extension: {
    minVersion: "1.0.0",
    storeUrl: "https://chrome.google.com/webstore/detail/bondery/example",
  },
};

export const EXAMPLE_HEALTH_OK_RESPONSE = {
  status: "ok" as const,
  timestamp: EXAMPLE_ISO_TIMESTAMP,
  cached: false,
  cacheExpiresAt: EXAMPLE_ISO_TIMESTAMP,
  services: {
    supabase: {
      auth: { ok: true, latencyMs: 12 },
      database: { ok: true, latencyMs: 18 },
      storage: { ok: true, latencyMs: 15 },
    },
    redis: { ok: true, latencyMs: 2 },
    smtp: { ok: true, configured: true },
    anthropic: { ok: true, configured: true },
    polar: { ok: true, configured: true },
    mapy: { ok: true, configured: true },
    posthog: { ok: true, configured: true },
  },
};

export const EXAMPLE_HEALTH_UNHEALTHY_RESPONSE = {
  ...EXAMPLE_HEALTH_OK_RESPONSE,
  status: "unhealthy" as const,
  services: {
    ...EXAMPLE_HEALTH_OK_RESPONSE.services,
    supabase: {
      auth: { ok: false, error: "Connection refused" },
      database: { ok: false, error: "Connection refused" },
      storage: { ok: false, error: "Connection refused" },
    },
  },
};
