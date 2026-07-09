import {
  EXAMPLE_CHAT_SESSION,
  EXAMPLE_INSTAGRAM_PREPARED_CONTACT,
  EXAMPLE_LINKEDIN_PREPARED_CONTACT,
  EXAMPLE_TAG,
  EXAMPLE_VCARD_PREPARED_CONTACT,
} from "./entities.js";
import {
  EXAMPLE_CONTACT_ID,
  EXAMPLE_CONTACT_ID_2,
  EXAMPLE_DATE,
  EXAMPLE_ISO_TIMESTAMP,
} from "./primitives.js";

/** POST /api/contacts body. */
export const EXAMPLE_CREATE_CONTACT_REQUEST = {
  firstName: "Ada",
  lastName: "Lovelace",
};

/** PATCH /api/contacts/:id body — partial update. */
export const EXAMPLE_PATCH_CONTACT_REQUEST = {
  notes: "Met at the Analytical Society dinner.",
};

/** POST /api/groups body. */
export const EXAMPLE_CREATE_GROUP_REQUEST = {
  color: "#6366f1",
  emoji: "⭐",
  label: "Inner Circle",
};

/** PATCH /api/groups/:id body. */
export const EXAMPLE_PATCH_GROUP_REQUEST = {
  label: "Close friends",
};

/** POST /api/tags body. */
export const EXAMPLE_CREATE_TAG_REQUEST = {
  label: "Investors",
};

/** PATCH /api/tags/:id body. */
export const EXAMPLE_PATCH_TAG_REQUEST = {
  color: "#6366F1",
};

/** POST /api/interactions body. */
export const EXAMPLE_CREATE_INTERACTION_REQUEST = {
  date: EXAMPLE_ISO_TIMESTAMP,
  participantIds: [EXAMPLE_CONTACT_ID],
  title: "Coffee catch-up",
  type: "Coffee",
};

/** PATCH /api/interactions/:id body. */
export const EXAMPLE_PATCH_INTERACTION_REQUEST = {
  description: "Discussed project updates.",
};

/** POST /api/contacts/:id/relationships body. */
export const EXAMPLE_CREATE_RELATIONSHIP_REQUEST = {
  relatedPersonId: EXAMPLE_CONTACT_ID_2,
  relationshipType: "colleague" as const,
};

/** PATCH /api/contacts/:id/relationships/:relationshipId body. */
export const EXAMPLE_PATCH_RELATIONSHIP_REQUEST = {
  relatedPersonId: EXAMPLE_CONTACT_ID_2,
  relationshipType: "friend" as const,
};

/** PUT /api/contacts/:id/important-dates body. */
export const EXAMPLE_REPLACE_IMPORTANT_DATES_REQUEST = {
  dates: [
    {
      date: EXAMPLE_DATE,
      note: null,
      notifyDaysBefore: 7,
      type: "birthday" as const,
    },
  ],
};

/** Bulk delete by IDs (`{ ids }` arm). */
export const EXAMPLE_IDS_REQUEST = {
  ids: [EXAMPLE_CONTACT_ID],
};

/** DELETE /api/contacts bulk by IDs. */
export const EXAMPLE_DELETE_CONTACTS_REQUEST = EXAMPLE_IDS_REQUEST;

/** Tag/group membership by person IDs. */
export const EXAMPLE_TAG_MEMBERSHIP_REQUEST = {
  personIds: [EXAMPLE_CONTACT_ID],
};

/** POST /api/groups/:id/contacts body (`personIds` arm). */
export const EXAMPLE_ADD_TO_GROUP_REQUEST = EXAMPLE_TAG_MEMBERSHIP_REQUEST;

/** DELETE /api/groups/:id/contacts body (`personIds` arm). */
export const EXAMPLE_REMOVE_FROM_GROUP_REQUEST = EXAMPLE_TAG_MEMBERSHIP_REQUEST;

/** POST /api/contacts/merge body. */
export const EXAMPLE_MERGE_CONTACTS_REQUEST = {
  conflictResolutions: {
    firstName: "left" as const,
  },
  leftPersonId: EXAMPLE_CONTACT_ID,
  rightPersonId: EXAMPLE_CONTACT_ID_2,
};

/** POST /api/contacts/:id/enrich body. */
export const EXAMPLE_ENRICH_CONTACT_REQUEST = {
  headline: "Mathematician",
  location: "London, UK",
};

/** POST /api/contacts/enrich-queue/init body. */
export const EXAMPLE_ENRICH_QUEUE_INIT_REQUEST = {
  personId: EXAMPLE_CONTACT_ID,
};

/** PATCH /api/contacts/enrich-queue/:id body. */
export const EXAMPLE_ENRICH_QUEUE_PATCH_REQUEST = {
  status: "completed" as const,
};

/** POST /api/contacts/:id/linkedin-data body. */
export const EXAMPLE_LINKEDIN_DATA_REQUEST = {
  workHistory: [
    {
      companyName: "Analytical Engines Ltd",
      title: "Mathematician",
    },
  ],
};

/** POST /api/contacts/share body. */
export const EXAMPLE_SHARE_CONTACT_REQUEST = {
  message: "Sharing Ada's contact card.",
  personId: EXAMPLE_CONTACT_ID,
  recipientEmails: ["friend@example.com"],
  selectedFields: ["name", "emails", "phones"],
  sendCopy: true,
};

/** POST /api/me/api-keys body. */
export const EXAMPLE_CREATE_API_KEY_REQUEST = {
  label: "Zapier integration",
  permission: "read" as const,
};

/** PATCH /api/me/api-keys/:id body. */
export const EXAMPLE_PATCH_API_KEY_REQUEST = {
  label: "CRM sync",
};

/** PATCH /api/me body. */
export const EXAMPLE_UPDATE_ACCOUNT_REQUEST = {
  name: "Ada",
  surname: "Lovelace",
};

/** PATCH /api/me/settings body. */
export const EXAMPLE_UPDATE_SETTINGS_REQUEST = {
  colorScheme: "dark" as const,
  timeFormat: "24h" as const,
};

/** POST /api/me/feedback body. */
export const EXAMPLE_FEEDBACK_REQUEST = {
  generalFeedback: "Would love calendar sync.",
  npsReason: "Great contact management UX.",
  npsScore: 9,
};

/** PATCH /api/chat/sessions/:sessionId body. */
export const EXAMPLE_UPDATE_CHAT_SESSION_REQUEST = {
  title: "Follow-up ideas",
};

/** POST /api/chat body. */
export const EXAMPLE_CHAT_REQUEST = {
  messages: [
    {
      id: "msg-1",
      parts: [{ text: "Who should I follow up with?", type: "text" }],
      role: "user",
    },
  ],
  sessionId: EXAMPLE_CHAT_SESSION.id,
};

/** POST /api/sync/push body. */
export const EXAMPLE_SYNC_PUSH_REQUEST = {
  deviceId: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  mutations: [
    {
      clientSequence: 1,
      id: "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
      payload: {
        firstName: "Ada",
        lastName: "Lovelace",
      },
      type: "contact.create" as const,
    },
  ],
};

/** POST /api/import/linkedin/commit (and similar import commits). */
export const EXAMPLE_LINKEDIN_IMPORT_COMMIT_REQUEST = {
  contacts: [EXAMPLE_LINKEDIN_PREPARED_CONTACT],
};

export const EXAMPLE_INSTAGRAM_IMPORT_COMMIT_REQUEST = {
  contacts: [EXAMPLE_INSTAGRAM_PREPARED_CONTACT],
};

export const EXAMPLE_VCARD_IMPORT_COMMIT_REQUEST = {
  contacts: [EXAMPLE_VCARD_PREPARED_CONTACT],
};

/** POST /api/extension/redirect body. */
export const EXAMPLE_EXTENSION_REDIRECT_REQUEST = {
  firstName: "Ada",
  lastName: "Lovelace",
  linkedin: "https://linkedin.com/in/ada-lovelace",
};

/** POST /api/contacts/:id/tags body. */
export const EXAMPLE_CONTACT_TAG_REQUEST = {
  tagId: EXAMPLE_TAG.id,
};

/** POST /api/internal/reminder-digest body. */
export const EXAMPLE_REMINDER_DIGEST_REQUEST = {
  targetDate: EXAMPLE_DATE,
  users: [
    {
      email: "ada@example.com",
      reminders: [
        {
          date: EXAMPLE_DATE,
          note: null,
          notifyDaysBefore: 7 as const,
          notifyOn: EXAMPLE_DATE,
          personId: EXAMPLE_CONTACT_ID,
          personName: "Ada Lovelace",
          type: "birthday" as const,
        },
      ],
      targetDate: EXAMPLE_DATE,
      timezone: "Europe/London",
      userId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    },
  ],
};
