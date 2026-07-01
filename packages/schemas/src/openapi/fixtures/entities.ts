import {
  EXAMPLE_CONTACT_ID,
  EXAMPLE_CONTACT_ID_2,
  EXAMPLE_DATE,
  EXAMPLE_ISO_TIMESTAMP,
  EXAMPLE_USER_ID,
} from "./primitives.js";

const nullContactFields = {
  middleName: null,
  headline: "Mathematician",
  location: "London, UK",
  notes: null,
  notesUpdatedAt: null,
  avatar: null,
  lastInteraction: EXAMPLE_ISO_TIMESTAMP,
  lastInteractionActivityId: null,
  keepFrequencyDays: 90,
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
  phones: [{ prefix: "+44", value: "2079460958", type: "home" as const, preferred: true }],
  emails: [{ value: "ada.lovelace@example.com", type: "work" as const, preferred: true }],
  addresses: null,
  linkedin: "https://linkedin.com/in/ada-lovelace",
  instagram: null,
  whatsapp: null,
  facebook: null,
  website: "https://example.com",
  signal: null,
  importantDates: null,
  myself: false,
  position: null,
  language: "en",
  timezone: "Europe/London",
  gisPoint: null,
  latitude: 51.5074,
  longitude: -0.1278,
};

/** Full contact read model sample. */
export const EXAMPLE_CONTACT = {
  id: EXAMPLE_CONTACT_ID,
  userId: EXAMPLE_USER_ID,
  firstName: "Ada",
  lastName: "Lovelace",
  ...nullContactFields,
};

/** Duplicate candidate for merge examples. */
export const EXAMPLE_CONTACT_DUPLICATE = {
  id: EXAMPLE_CONTACT_ID_2,
  userId: EXAMPLE_USER_ID,
  firstName: "Ada",
  middleName: null,
  lastName: "Lovelace",
  headline: null,
  location: null,
  notes: null,
  notesUpdatedAt: null,
  avatar: null,
  lastInteraction: null,
  lastInteractionActivityId: null,
  keepFrequencyDays: null,
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
  phones: [],
  emails: [],
  addresses: null,
  linkedin: null,
  instagram: null,
  whatsapp: null,
  facebook: null,
  website: null,
  signal: null,
  importantDates: null,
  myself: null,
  position: null,
  language: null,
  timezone: null,
  gisPoint: null,
  latitude: null,
  longitude: null,
};

export const EXAMPLE_CONTACT_PREVIEW = {
  id: EXAMPLE_CONTACT_ID,
  firstName: "Ada",
  lastName: "Lovelace",
  avatar: null,
};

export const EXAMPLE_GROUP = {
  id: "770e8400-e29b-41d4-a716-446655440001",
  userId: EXAMPLE_USER_ID,
  label: "Inner Circle",
  emoji: "⭐",
  color: "#6366f1",
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
};

export const EXAMPLE_GROUP_WITH_COUNT = {
  ...EXAMPLE_GROUP,
  contactCount: 12,
  previewContacts: [EXAMPLE_CONTACT_PREVIEW],
};

export const EXAMPLE_TAG = {
  id: "880e8400-e29b-41d4-a716-446655440002",
  userId: EXAMPLE_USER_ID,
  label: "VIP",
  color: "#f59e0b",
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
};

export const EXAMPLE_TAG_WITH_COUNT = {
  ...EXAMPLE_TAG,
  contactCount: 5,
  previewContacts: [EXAMPLE_CONTACT_PREVIEW],
};

export const EXAMPLE_INTERACTION = {
  id: "990e8400-e29b-41d4-a716-446655440003",
  userId: EXAMPLE_USER_ID,
  title: "Coffee catch-up",
  type: "Coffee" as const,
  description: "Discussed project updates.",
  date: EXAMPLE_DATE,
  participants: [
    {
      id: EXAMPLE_CONTACT_ID,
      first_name: "Ada",
      last_name: "Lovelace",
      avatar: null,
    },
  ],
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
};

export const EXAMPLE_IMPORTANT_DATE = {
  id: "aa0e8400-e29b-41d4-a716-446655440004",
  userId: EXAMPLE_USER_ID,
  personId: EXAMPLE_CONTACT_ID,
  type: "birthday" as const,
  date: "1815-12-10",
  note: "Send a card",
  notifyDaysBefore: 7 as const,
  notifyOn: "2026-12-03",
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
};

export const EXAMPLE_RELATIONSHIP = {
  id: "bb0e8400-e29b-41d4-a716-446655440005",
  userId: EXAMPLE_USER_ID,
  sourcePersonId: EXAMPLE_CONTACT_ID,
  targetPersonId: EXAMPLE_CONTACT_ID_2,
  relationshipType: "colleague" as const,
  createdAt: EXAMPLE_ISO_TIMESTAMP,
  updatedAt: EXAMPLE_ISO_TIMESTAMP,
};

export const EXAMPLE_RELATIONSHIP_WITH_PEOPLE = {
  ...EXAMPLE_RELATIONSHIP,
  sourcePerson: EXAMPLE_CONTACT_PREVIEW,
  targetPerson: {
    id: EXAMPLE_CONTACT_ID_2,
    firstName: "Charles",
    lastName: "Babbage",
    avatar: null,
  },
};

export const EXAMPLE_MERGE_RECOMMENDATION = {
  id: "cc0e8400-e29b-41d4-a716-446655440006",
  leftPerson: EXAMPLE_CONTACT,
  rightPerson: EXAMPLE_CONTACT_DUPLICATE,
  score: 0.95,
  reasons: ["fullName" as const],
};

export const EXAMPLE_LINKEDIN_PREPARED_CONTACT = {
  tempId: "tmp-linkedin-1",
  firstName: "Ada",
  middleName: null,
  lastName: "Lovelace",
  linkedinUrl: "https://linkedin.com/in/ada-lovelace",
  linkedinUsername: "ada-lovelace",
  alreadyExists: false,
  email: "ada.lovelace@example.com",
  company: "Analytical Engines Ltd",
  position: "Mathematician",
  connectedAt: EXAMPLE_ISO_TIMESTAMP,
  connectedOnRaw: "15 Jan 2026",
  isValid: true,
  issues: [] as string[],
};

export const EXAMPLE_INSTAGRAM_PREPARED_CONTACT = {
  tempId: "tmp-instagram-1",
  firstName: "Ada",
  middleName: null,
  lastName: "Lovelace",
  instagramUrl: "https://instagram.com/ada",
  instagramUsername: "ada",
  alreadyExists: false,
  likelyPerson: true,
  connectedAt: null,
  connectedOnRaw: null,
  sources: ["following" as const],
  isValid: true,
  issues: [] as string[],
};

export const EXAMPLE_VCARD_PREPARED_CONTACT = {
  tempId: "tmp-vcard-1",
  firstName: "Ada",
  middleName: null,
  lastName: "Lovelace",
  headline: "Mathematician",
  phones: [{ prefix: "+44", value: "2079460958", type: "home" as const, preferred: true }],
  emails: [{ value: "ada@example.com", type: "work" as const, preferred: true }],
  addresses: [],
  linkedin: null,
  instagram: null,
  whatsapp: null,
  facebook: null,
  signal: null,
  website: null,
  avatarUri: null,
  importantDates: null,
  isValid: true,
  issues: [] as string[],
};

export const EXAMPLE_SUBSCRIPTION_STATUS = {
  plan: "premium" as const,
  aiMessagesUsed: 12,
  aiMessageLimit: 500,
  aiMonthlyResetAt: EXAMPLE_ISO_TIMESTAMP,
  canUseChat: true,
  currentPeriodEnd: EXAMPLE_ISO_TIMESTAMP,
  cancelAtPeriodEnd: false,
  polarStatus: "active" as const,
  trialEndsAt: null,
  amount: 900,
  currency: "usd",
  productName: "Bondery Premium",
  recurringInterval: "month" as const,
};

export const EXAMPLE_API_KEY_LIST_ITEM = {
  id: "dd0e8400-e29b-41d4-a716-446655440007",
  label: "Zapier integration",
  permission: "read" as const,
  keyPrefix: "bondery_key_dd0e8400",
  lastUsedAt: EXAMPLE_ISO_TIMESTAMP,
  createdAt: EXAMPLE_ISO_TIMESTAMP,
};

export const EXAMPLE_USER_SETTINGS = {
  name: "Ada Lovelace",
  timezone: "Europe/London",
  reminderSendHour: "09:00",
  timeFormat: "24h",
  language: "en",
  colorScheme: "auto" as const,
  leftSwipeAction: "call",
  rightSwipeAction: "email",
  groupSortOrder: "alpha-asc",
  tagSortOrder: "count-desc",
  avatarUrl: null,
  onboardingCompletedAt: EXAMPLE_ISO_TIMESTAMP,
  aiMessagesUsed: 12,
  email: "ada@example.com",
  providers: ["email"],
  identities: [
    {
      id: "ee0e8400-e29b-41d4-a716-446655440008",
      user_id: EXAMPLE_USER_ID,
      identity_id: "identity-1",
      provider: "email",
    },
  ],
};

export const EXAMPLE_CHAT_SESSION = {
  id: "ff0e8400-e29b-41d4-a716-446655440009",
  user_id: EXAMPLE_USER_ID,
  title: "Who should I follow up with?",
  created_at: EXAMPLE_ISO_TIMESTAMP,
  updated_at: EXAMPLE_ISO_TIMESTAMP,
};

export const EXAMPLE_CHAT_MESSAGE = {
  id: "000e8400-e29b-41d4-a716-44665544000a",
  session_id: "ff0e8400-e29b-41d4-a716-446655440009",
  role: "user",
  content: "Who haven't I spoken to in 90 days?",
  created_at: EXAMPLE_ISO_TIMESTAMP,
};

export const EXAMPLE_GEOCODE_ADDRESS = {
  value: "10 Downing Street, London SW1A 2AA, UK",
  type: "home" as const,
  label: "10 Downing Street",
  latitude: 51.5034,
  longitude: -0.1276,
  addressLine1: "10 Downing Street",
  addressLine2: null,
  addressCity: "London",
  addressPostalCode: "SW1A 2AA",
  addressState: "England",
  addressStateCode: "ENG",
  addressCountry: "United Kingdom",
  addressCountryCode: "GB",
  addressGranularity: "address" as const,
  addressFormatted: "10 Downing St, London SW1A 2AA, UK",
  addressGeocodeSource: "mapy.com" as const,
  geocodeConfidence: "verified" as const,
  timezone: "Europe/London",
};
