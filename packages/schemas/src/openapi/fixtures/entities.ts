import {
  EXAMPLE_CONTACT_ID,
  EXAMPLE_CONTACT_ID_2,
  EXAMPLE_ISO_TIMESTAMP,
  EXAMPLE_USER_ID,
} from "./primitives.js";

const nullContactFields = {
  addresses: null,
  avatar: null,
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  emails: [{ preferred: true, type: "work" as const, value: "ada.lovelace@example.com" }],
  facebook: null,
  gisPoint: null,
  headline: "Mathematician",
  importantDates: null,
  instagram: null,
  keepFrequencyDays: 90,
  language: "en",
  lastInteraction: EXAMPLE_ISO_TIMESTAMP,
  lastInteractionActivityId: null,
  latitude: 51.5074,
  linkedin: "https://linkedin.com/in/ada-lovelace",
  location: "London, UK",
  longitude: -0.1278,
  middleName: null,
  myself: false,
  notes: null,
  notesUpdatedAt: null,
  phones: [{ preferred: true, prefix: "+44", type: "home" as const, value: "2079460958" }],
  position: null,
  signal: null,
  timezone: "Europe/London",
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
  website: "https://example.com",
  whatsapp: null,
};

/** Full contact read model sample. */
export const EXAMPLE_CONTACT = {
  firstName: "Ada",
  id: EXAMPLE_CONTACT_ID,
  lastName: "Lovelace",
  userId: EXAMPLE_USER_ID,
  ...nullContactFields,
};

/** Duplicate candidate for merge examples. */
export const EXAMPLE_CONTACT_DUPLICATE = {
  addresses: null,
  avatar: null,
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  emails: [],
  facebook: null,
  firstName: "Ada",
  gisPoint: null,
  headline: null,
  id: EXAMPLE_CONTACT_ID_2,
  importantDates: null,
  instagram: null,
  keepFrequencyDays: null,
  language: null,
  lastInteraction: null,
  lastInteractionActivityId: null,
  lastName: "Lovelace",
  latitude: null,
  linkedin: null,
  location: null,
  longitude: null,
  middleName: null,
  myself: null,
  notes: null,
  notesUpdatedAt: null,
  phones: [],
  position: null,
  signal: null,
  timezone: null,
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
  userId: EXAMPLE_USER_ID,
  website: null,
  whatsapp: null,
};

export const EXAMPLE_CONTACT_PREVIEW = {
  avatar: null,
  firstName: "Ada",
  id: EXAMPLE_CONTACT_ID,
  lastName: "Lovelace",
};

export const EXAMPLE_GROUP = {
  color: "#6366f1",
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  emoji: "⭐",
  id: "770e8400-e29b-41d4-a716-446655440001",
  label: "Inner Circle",
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
  userId: EXAMPLE_USER_ID,
};

export const EXAMPLE_GROUP_WITH_COUNT = {
  ...EXAMPLE_GROUP,
  contactCount: 12,
  previewContacts: [EXAMPLE_CONTACT_PREVIEW],
};

export const EXAMPLE_TAG = {
  color: "#f59e0b",
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  id: "880e8400-e29b-41d4-a716-446655440002",
  label: "VIP",
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
  userId: EXAMPLE_USER_ID,
};

export const EXAMPLE_TAG_WITH_COUNT = {
  ...EXAMPLE_TAG,
  contactCount: 5,
  previewContacts: [EXAMPLE_CONTACT_PREVIEW],
};

export const EXAMPLE_INTERACTION = {
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  date: EXAMPLE_ISO_TIMESTAMP,
  description: "Discussed project updates.",
  id: "990e8400-e29b-41d4-a716-446655440003",
  participants: [
    {
      avatar: null,
      firstName: "Ada",
      id: EXAMPLE_CONTACT_ID,
      lastName: "Lovelace",
    },
  ],
  title: "Coffee catch-up",
  type: "Coffee" as const,
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
  userId: EXAMPLE_USER_ID,
};

export const EXAMPLE_IMPORTANT_DATE = {
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  date: "1815-12-10",
  id: "aa0e8400-e29b-41d4-a716-446655440004",
  note: "Send a card",
  notifyDaysBefore: 7 as const,
  notifyOn: "2026-12-03",
  personId: EXAMPLE_CONTACT_ID,
  type: "birthday" as const,
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
  userId: EXAMPLE_USER_ID,
};

export const EXAMPLE_RELATIONSHIP = {
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  id: "bb0e8400-e29b-41d4-a716-446655440005",
  relationshipType: "colleague" as const,
  sourcePersonId: EXAMPLE_CONTACT_ID,
  targetPersonId: EXAMPLE_CONTACT_ID_2,
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
  userId: EXAMPLE_USER_ID,
};

export const EXAMPLE_RELATIONSHIP_WITH_PEOPLE = {
  ...EXAMPLE_RELATIONSHIP,
  sourcePerson: EXAMPLE_CONTACT_PREVIEW,
  targetPerson: {
    avatar: null,
    firstName: "Charles",
    id: EXAMPLE_CONTACT_ID_2,
    lastName: "Babbage",
  },
};

export const EXAMPLE_MERGE_RECOMMENDATION = {
  id: "cc0e8400-e29b-41d4-a716-446655440006",
  leftPerson: EXAMPLE_CONTACT,
  reasons: ["fullName" as const],
  rightPerson: EXAMPLE_CONTACT_DUPLICATE,
  score: 0.95,
};

export const EXAMPLE_LINKEDIN_PREPARED_CONTACT = {
  alreadyExists: false,
  company: "Analytical Engines Ltd",
  connectedAt: EXAMPLE_ISO_TIMESTAMP,
  connectedOnRaw: "15 Jan 2026",
  email: "ada.lovelace@example.com",
  firstName: "Ada",
  issues: [] as string[],
  isValid: true,
  lastName: "Lovelace",
  linkedinUrl: "https://linkedin.com/in/ada-lovelace",
  linkedinUsername: "ada-lovelace",
  middleName: null,
  position: "Mathematician",
  tempId: "tmp-linkedin-1",
};

export const EXAMPLE_INSTAGRAM_PREPARED_CONTACT = {
  alreadyExists: false,
  connectedAt: null,
  connectedOnRaw: null,
  firstName: "Ada",
  instagramUrl: "https://instagram.com/ada",
  instagramUsername: "ada",
  issues: [] as string[],
  isValid: true,
  lastName: "Lovelace",
  likelyPerson: true,
  middleName: null,
  sources: ["following" as const],
  tempId: "tmp-instagram-1",
};

export const EXAMPLE_VCARD_PREPARED_CONTACT = {
  addresses: [],
  avatarUri: null,
  emails: [{ preferred: true, type: "work" as const, value: "ada@example.com" }],
  facebook: null,
  firstName: "Ada",
  headline: "Mathematician",
  importantDates: null,
  instagram: null,
  issues: [] as string[],
  isValid: true,
  lastName: "Lovelace",
  linkedin: null,
  middleName: null,
  phones: [{ preferred: true, prefix: "+44", type: "home" as const, value: "2079460958" }],
  signal: null,
  tempId: "tmp-vcard-1",
  website: null,
  whatsapp: null,
};

export const EXAMPLE_SUBSCRIPTION_STATUS = {
  aiMessageLimit: 500,
  aiMessagesUsed: 12,
  aiMonthlyResetAt: EXAMPLE_ISO_TIMESTAMP,
  amount: 900,
  cancelAtPeriodEnd: false,
  canUseChat: true,
  currency: "usd",
  currentPeriodEnd: EXAMPLE_ISO_TIMESTAMP,
  plan: "premium" as const,
  polarStatus: "active" as const,
  productName: "Bondery Premium",
  recurringInterval: "month" as const,
  trialEndsAt: null,
};

export const EXAMPLE_API_KEY_LIST_ITEM = {
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  id: "dd0e8400-e29b-41d4-a716-446655440007",
  keyPrefix: "bondery_key_dd0e8400",
  label: "Zapier integration",
  lastUsedAt: EXAMPLE_ISO_TIMESTAMP,
  permission: "read" as const,
};

export const EXAMPLE_USER_SETTINGS = {
  aiMessagesUsed: 12,
  avatarUrl: null,
  colorScheme: "auto" as const,
  email: "ada@example.com",
  gettingStartedDismissedAt: EXAMPLE_ISO_TIMESTAMP,
  groupSortOrder: "alpha-asc",
  identities: [
    {
      id: "ee0e8400-e29b-41d4-a716-446655440008",
      identity_id: "identity-1",
      provider: "email",
      user_id: EXAMPLE_USER_ID,
    },
  ],
  importCompletedAt: null,
  importFollowupPlatform: null,
  importFollowupStatus: null,
  language: "en",
  leftSwipeAction: "call",
  name: "Ada Lovelace",
  onboardingCompletedAt: EXAMPLE_ISO_TIMESTAMP,
  providers: ["email"],
  reminderSendHour: "09:00",
  rightSwipeAction: "email",
  tagSortOrder: "count-desc",
  timeFormat: "24h",
  timezone: "Europe/London",
};

export const EXAMPLE_CHAT_SESSION = {
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  id: "ff0e8400-e29b-41d4-a716-446655440009",
  title: "Who should I follow up with?",
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
  userId: EXAMPLE_USER_ID,
};

export const EXAMPLE_CHAT_MESSAGE = {
  content: "Who haven't I spoken to in 90 days?",
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  id: "000e8400-e29b-41d4-a716-44665544000a",
  role: "user",
  sessionId: "ff0e8400-e29b-41d4-a716-446655440009",
};

export const EXAMPLE_GEOCODE_ADDRESS = {
  addressCity: "London",
  addressCountry: "United Kingdom",
  addressCountryCode: "GB",
  addressFormatted: "10 Downing St, London SW1A 2AA, UK",
  addressGeocodeSource: "mapy.com" as const,
  addressGranularity: "address" as const,
  addressLine1: "10 Downing Street",
  addressLine2: null,
  addressPostalCode: "SW1A 2AA",
  addressState: "England",
  addressStateCode: "ENG",
  geocodeConfidence: "verified" as const,
  label: "10 Downing Street",
  latitude: 51.5034,
  longitude: -0.1276,
  timezone: "Europe/London",
  type: "home" as const,
  value: "10 Downing Street, London SW1A 2AA, UK",
};
