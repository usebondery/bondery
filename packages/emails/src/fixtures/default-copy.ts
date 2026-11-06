import type { AccountDeletedEmailCopy } from "#templates/account/AccountDeletedEmail.js";
import type { MagicLinkEmailCopy } from "#templates/account/MagicLinkEmail.js";
import type { WelcomeEmailCopy } from "#templates/account/WelcomeEmail.js";
import type { TrialEndingEmailCopy } from "#templates/billing/TrialEndingEmail.js";
import type { FeedbackEmailCopy } from "#templates/internal/FeedbackEmail.js";
import type {
  ReminderDigestEmailCopy,
  ReminderDigestEmailItem,
} from "#templates/notifications/ReminderDigestEmail.js";
import type { ShareContactEmailCopy } from "#templates/notifications/ShareContactEmail.js";

export { defaultEmailChromeCopy } from "#shared/chrome.js";

export const defaultMagicLinkCopy: MagicLinkEmailCopy = {
  body: "This sign-in link expires in 15 minutes.",
  cta: "Sign in to Bondery",
  heading: "Your sign-in link",
  ignore: "If you didn't ask for this, you can ignore this email.",
  preview: "Expires in 15 minutes",
  whyReceiving:
    "You're receiving this because someone (hopefully you) asked to sign in to Bondery with this email.",
};

export const defaultWelcomeCopy: WelcomeEmailCopy = {
  body: "Bondery helps you stay close to the people who matter — track interactions, remember important dates, and nurture your relationships in one place.",
  getStarted: "Open Bondery",
  heading: "Welcome to Bondery",
  preview: "Your personal CRM for meaningful relationships",
  whyReceiving: "You're receiving this because you just created a Bondery account.",
};

export const defaultTrialEndingCopy: TrialEndingEmailCopy = {
  body: "After that, your subscription will renew automatically unless you cancel.",
  cta: "Manage subscription",
  heading: "Your Premium trial ends on {{endDate}}",
  preview: "Your subscription renews unless you cancel",
  whyReceiving: "You're receiving this because you have a Bondery Premium trial.",
};

export const defaultAccountDeletedCopy: AccountDeletedEmailCopy = {
  body: "This confirms that your Bondery account and associated data in our systems have been deleted.",
  feedback:
    "If you have feedback about Bondery or why you left, you can reply to this email. We read every message.",
  heading: "Your Bondery account has been deleted",
  preview: "This confirms the deletion. Reply if you have feedback.",
  thanks: "Thank you for trying Bondery. 💜",
};

export const defaultFeedbackCopy: FeedbackEmailCopy = {
  agentActualHeading: "What the tool returned:",
  agentExpectedHeading: "What the agent expected:",
  agentKindLabel: "Report kind:",
  agentRequestIdLabel: "Request ID:",
  agentSourceHeading: "Reported by an AI agent",
  agentToolLabel: "Tool:",
  description: "NPS {{npsScore}} / 10 · {{timestamp}}",
  generalFeedbackHeading: "General feedback:",
  heading: "Feedback from {{userEmail}}",
  notProvided: "(Not provided)",
  npsReasonHeading: "Why did they pick this score?",
  npsScoreLabel: "NPS score:",
  npsScoreValue: "{{npsScore}} / 10",
  preview: "New feedback from {{userEmail}} - NPS Score: {{npsScore}}",
  replyCta: "Reply to {{userEmail}}",
  submittedAt: "Submitted at: {{timestamp}}",
  userEmailLabel: "User email:",
  userIdLabel: "User ID:",
};

export const defaultReminderDigestCopy: ReminderDigestEmailCopy = {
  cta: "Open reminders",
  dateTypes: {
    anniversary: "Anniversary",
    birthday: "Birthday",
    graduation: "Graduation",
    nameday: "Name day",
    other: "Important date",
  },
  dayMany: "{{count}} days",
  dayOne: "1 day",
  description: "For {{headingDate}}. Open a person to see details or send a note.",
  headingMany: "{{count}} reminders coming up",
  headingOne: "1 reminder coming up",
  preview: "{{firstPersonName}}'s {{firstTypeLabel}} in {{firstRemainingLabel}}",
  previewMore:
    "{{firstPersonName}}'s {{firstTypeLabel}} in {{firstRemainingLabel}} and {{remainingCount}} more",
  reminderLine: "{{emoji}} {{typeLabel}} is coming up in {{remainingLabel}} on {{dateLabel}}.",
  whyReceiving: "You're receiving this because you turned on reminders for these dates.",
};

export const previewReminderDigestItems: ReminderDigestEmailItem[] = [
  {
    date: "1990-03-15",
    dateLabel: "March 15",
    note: "Send a message before the weekend.",
    notifyDaysBefore: 7,
    notifyOn: "2026-03-08",
    personAvatar: null,
    personId: "preview-person-1",
    personName: "Jane Doe",
    remainingLabel: "7 days",
    type: "birthday",
    typeLabel: "Birthday",
  },
  {
    date: "2018-06-01",
    dateLabel: "June 1",
    note: null,
    notifyDaysBefore: 3,
    notifyOn: "2026-05-29",
    personAvatar: null,
    personId: "preview-person-2",
    personName: "Alex Smith",
    remainingLabel: "3 days",
    type: "anniversary",
    typeLabel: "Work anniversary",
  },
];

export const defaultShareContactCopy: ShareContactEmailCopy = {
  description: "{{senderName}} shared this contact with you",
  footerNotes: "Sent with Bondery. Reply to this email to reach {{senderName}}.",
  importantDateLine: "{{label}}: {{date}} ({{type}})",
  labels: {
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
  },
  previewFallback: "Phone, email, and other details inside",
  replyCta: "Reply to {{senderName}}",
};
