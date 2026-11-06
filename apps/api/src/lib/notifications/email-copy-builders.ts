import type {
  AccountDeletedEmailCopy,
  FeedbackEmailCopy,
  MagicLinkEmailCopy,
  ReminderDigestEmailCopy,
  ShareContactEmailCopy,
  TrialEndingEmailCopy,
  WelcomeEmailCopy,
} from "@bondery/emails";
import { readCopyString } from "./email-i18n.js";

function readNestedLabels(
  bundle: Record<string, unknown>,
  key: string,
): ShareContactEmailCopy["labels"] {
  const labels = bundle[key];
  if (!labels || typeof labels !== "object") {
    return defaultShareLabels();
  }

  const record = labels as Record<string, string>;
  return {
    address: record.address ?? "Address",
    email: record.email ?? "Email",
    facebook: record.facebook ?? "Facebook",
    importantDates: record.importantDates ?? "Important dates",
    instagram: record.instagram ?? "Instagram",
    linkedin: record.linkedin ?? "LinkedIn",
    location: record.location ?? "Location",
    notes: record.notes ?? "Notes",
    phone: record.phone ?? "Phone",
    signal: record.signal ?? "Signal",
    website: record.website ?? "Website",
    whatsapp: record.whatsapp ?? "WhatsApp",
  };
}

function defaultShareLabels(): ShareContactEmailCopy["labels"] {
  return {
    address: "Address",
    email: "Email",
    facebook: "Facebook",
    importantDates: "Important dates",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    location: "Location",
    notes: "Notes",
    phone: "Phone",
    signal: "Signal",
    website: "Website",
    whatsapp: "WhatsApp",
  };
}

function readDateTypes(bundle: Record<string, unknown>): ReminderDigestEmailCopy["dateTypes"] {
  const dateTypes = bundle.dateTypes;
  if (!dateTypes || typeof dateTypes !== "object") {
    return {
      anniversary: "Anniversary",
      birthday: "Birthday",
      graduation: "Graduation",
      nameday: "Name day",
      other: "Important date",
    };
  }

  const record = dateTypes as Record<string, string>;
  return {
    anniversary: record.anniversary ?? "Anniversary",
    birthday: record.birthday ?? "Birthday",
    graduation: record.graduation ?? "Graduation",
    nameday: record.nameday ?? "Name day",
    other: record.other ?? "Important date",
  };
}

export function buildTrialEndingCopy(bundle: Record<string, unknown>): TrialEndingEmailCopy {
  return {
    body: readCopyString(bundle, "body"),
    cta: readCopyString(bundle, "cta"),
    heading: readCopyString(bundle, "heading"),
    preview: readCopyString(bundle, "preview"),
    whyReceiving: readCopyString(bundle, "whyReceiving"),
  };
}

export function buildAccountDeletedCopy(bundle: Record<string, unknown>): AccountDeletedEmailCopy {
  return {
    body: readCopyString(bundle, "body"),
    feedback: readCopyString(bundle, "feedback"),
    heading: readCopyString(bundle, "heading"),
    preview: readCopyString(bundle, "preview"),
    thanks: readCopyString(bundle, "thanks"),
  };
}

export function buildMagicLinkCopy(bundle: Record<string, unknown>): MagicLinkEmailCopy {
  return {
    body: readCopyString(bundle, "body"),
    cta: readCopyString(bundle, "cta"),
    heading: readCopyString(bundle, "heading"),
    ignore: readCopyString(bundle, "ignore"),
    preview: readCopyString(bundle, "preview"),
    whyReceiving: readCopyString(bundle, "whyReceiving"),
  };
}

export function buildWelcomeCopy(bundle: Record<string, unknown>): WelcomeEmailCopy {
  return {
    body: readCopyString(bundle, "body"),
    getStarted: readCopyString(bundle, "getStarted"),
    heading: readCopyString(bundle, "heading"),
    preview: readCopyString(bundle, "preview"),
    whyReceiving: readCopyString(bundle, "whyReceiving"),
  };
}

export function buildFeedbackCopy(bundle: Record<string, unknown>): FeedbackEmailCopy {
  return {
    agentActualHeading: readCopyString(bundle, "agentActualHeading"),
    agentExpectedHeading: readCopyString(bundle, "agentExpectedHeading"),
    agentKindLabel: readCopyString(bundle, "agentKindLabel"),
    agentRequestIdLabel: readCopyString(bundle, "agentRequestIdLabel"),
    agentSourceHeading: readCopyString(bundle, "agentSourceHeading"),
    agentToolLabel: readCopyString(bundle, "agentToolLabel"),
    description: readCopyString(bundle, "description"),
    generalFeedbackHeading: readCopyString(bundle, "generalFeedbackHeading"),
    heading: readCopyString(bundle, "heading"),
    notProvided: readCopyString(bundle, "notProvided"),
    npsReasonHeading: readCopyString(bundle, "npsReasonHeading"),
    npsScoreLabel: readCopyString(bundle, "npsScoreLabel"),
    npsScoreValue: readCopyString(bundle, "npsScoreValue"),
    preview: readCopyString(bundle, "preview"),
    replyCta: readCopyString(bundle, "replyCta"),
    submittedAt: readCopyString(bundle, "submittedAt"),
    userEmailLabel: readCopyString(bundle, "userEmailLabel"),
    userIdLabel: readCopyString(bundle, "userIdLabel"),
  };
}

export function buildReminderDigestCopy(bundle: Record<string, unknown>): ReminderDigestEmailCopy {
  return {
    cta: readCopyString(bundle, "cta"),
    dateTypes: readDateTypes(bundle),
    dayMany: readCopyString(bundle, "dayMany"),
    dayOne: readCopyString(bundle, "dayOne"),
    description: readCopyString(bundle, "description"),
    headingMany: readCopyString(bundle, "headingMany"),
    headingOne: readCopyString(bundle, "headingOne"),
    preview: readCopyString(bundle, "preview"),
    previewMore: readCopyString(bundle, "previewMore"),
    reminderLine: readCopyString(bundle, "reminderLine"),
    whyReceiving: readCopyString(bundle, "whyReceiving"),
  };
}

export function buildShareContactCopy(bundle: Record<string, unknown>): ShareContactEmailCopy {
  return {
    description: readCopyString(bundle, "description"),
    footerNotes: readCopyString(bundle, "footerNotes"),
    importantDateLine: readCopyString(bundle, "importantDateLine"),
    labels: readNestedLabels(bundle, "labels"),
    previewFallback: readCopyString(bundle, "previewFallback"),
    replyCta: readCopyString(bundle, "replyCta"),
  };
}
