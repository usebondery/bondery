"use client";

import { Group, Stack, Paper, Text, Button, Tabs, Box } from "@mantine/core";
import { Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Mention from "@tiptap/extension-mention";
import Emoji from "@tiptap/extension-emoji";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { ReactNodeViewRenderer } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { InlineDateExtension } from "./components/InlineDateExtension";
import { MarkdownPasteExtension } from "./components/MarkdownPasteExtension";
import { SlashCommandExtension } from "./components/SlashCommandExtension";
import { slashCommandSuggestion } from "./components/slashCommandSuggestion";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconUser,
  IconMapPin,
  IconClock,
  IconCalendarEvent,
  IconUserCircle,
  IconTags,
  IconBrandLinkedin,
  IconPlus,
} from "@tabler/icons-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { extractUsername } from "@/lib/socialsHelpers";
import { parsePhoneNumber, combinePhoneNumber } from "@/lib/phoneHelpers";
import { formatContactName } from "@/lib/nameHelpers";
import type {
  Contact,
  ContactAddressEntry,
  ContactPreview,
  ContactRelationshipWithPeople,
  Group as GroupType,
  GroupWithCount,
  PhoneEntry,
  EmailEntry,
  Activity,
  RelationshipType,
  ImportantDate,
  MergeConflictField,
  MergeRecommendation,
  Tag,
  WorkHistoryEntry,
  EducationEntry,
} from "@bondery/types";
import { ContactActionMenu } from "./components/ContactActionMenu";
import { ContactIdentitySection } from "./components/ContactIdentitySection";
import { ContactPreferenceSection } from "./components/ContactPreferenceSection";
import { ContactRelationshipsSection } from "./components/ContactRelationshipsSection";
import { ContactNotesSection } from "./components/ContactNotesSection";
import { ContactAddressSection } from "./components/ContactAddressSection";
import { ContactImportantDatesSection } from "./components/ContactImportantDatesSection";
import { PersonInteractionsSection } from "./components/PersonInteractionsSection";
import { openNewActivityModal } from "../../interactions/components/NewActivityModal";
import { DatePickerWithPresets } from "@/app/(app)/app/components/interactions/DatePickerWithPresets";
import { LinkedInTab } from "./components/LinkedInTab";
import { useBatchEnrichFromLinkedIn } from "@/lib/extension/useBatchEnrichFromLinkedIn";
// import { ContactPGPSection } from "./components/ContactPGPSection";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { HELP_DOCS_URL } from "@bondery/helpers";
import {
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { revalidateContacts, revalidateRelationships } from "../../actions";
import { getTimezoneForCoordinates } from "@/app/(app)/app/map/actions";
import { resolveToCanonicalTimezone } from "@/lib/timezones";
import { openDeleteContactModal } from "@/app/(app)/app/components/contacts/openDeleteContactModal";
import { openStandardConfirmModal } from "@/app/(app)/app/components/modals/openStandardConfirmModal";
import { GroupCard } from "../../groups/components/GroupCard";
import { PersonTagsInput } from "./components/PersonTagsInput";
import { openAddPeopleToGroupSelectionModal } from "../../people/components/AddPeopleToGroupSelectionModal";
import { MERGE_CONFLICT_FIELDS, openMergeWithModal } from "../../people/components/MergeWithModal";
import { openShareContactModal } from "../../people/components/ShareContactModal";
import { WEBSITE_URL } from "@/lib/config";
import { createMentionSuggestion } from "./components/mentionSuggestion";
import { emojiSuggestionRender } from "./components/emojiSuggestion";
import type { MentionSuggestionItem } from "./components/MentionList";
import { MentionNodeView } from "./components/MentionNodeView";
import { TaskItemNodeView } from "./components/TaskItemNodeView";
import { RecommendationsSection } from "./components/RecommendationsSection";

interface PersonClientProps {
  initialContact: Contact;
  initialConnectedContacts: Contact[];
  initialSelectableContacts: Contact[];
  initialRelationships: ContactRelationshipWithPeople[];
  initialImportantDates: ImportantDate[];
  initialGroups: GroupType[];
  initialPersonGroups: GroupType[];
  initialAllTags: Tag[];
  initialPersonTags: Tag[];
  initialActivities: Activity[];
  initialWorkHistory: WorkHistoryEntry[];
  initialEducation: EducationEntry[];
  initialLinkedinBio?: string | null;
  initialSyncedAt?: string | null;
  initialMergeRecommendation?: MergeRecommendation | null;
  personId: string;
  initialTab?: string;
}

const PERSON_TABS = ["interactions", "about", "organize", "linkedin"] as const;
type PersonTabValue = (typeof PERSON_TABS)[number];
const DEFAULT_TAB: PersonTabValue = "interactions";

export default function PersonClient({
  initialContact,
  initialConnectedContacts,
  initialSelectableContacts,
  initialRelationships,
  initialImportantDates,
  initialGroups,
  initialPersonGroups,
  initialAllTags,
  initialPersonTags,
  initialActivities = [],
  initialWorkHistory = [],
  initialEducation = [],
  initialLinkedinBio = null,
  initialSyncedAt = null,
  initialMergeRecommendation = null,
  personId,
  initialTab,
}: PersonClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const resolvedInitialTab: PersonTabValue = PERSON_TABS.includes(initialTab as PersonTabValue)
    ? (initialTab as PersonTabValue)
    : DEFAULT_TAB;
  const [activeTab, setActiveTab] = useState<PersonTabValue>(resolvedInitialTab);

  const handleTabChange = useCallback(
    (value: string | null) => {
      const tab = PERSON_TABS.includes(value as PersonTabValue)
        ? (value as PersonTabValue)
        : DEFAULT_TAB;
      setActiveTab(tab);
      const query = tab === DEFAULT_TAB ? "" : `?tab=${tab}`;
      router.replace(`${pathname}${query}`, { scroll: false });
    },
    [pathname, router],
  );
  const tRelationships = useTranslations("PersonRelationships");
  const tEnrich = useTranslations("EnrichFromLinkedIn");
  const { startForPerson } = useBatchEnrichFromLinkedIn();
  const tImportantDates = useTranslations("ContactImportantDates");
  const tPersonPage = useTranslations("SingleContactPage");
  const tMerge = useTranslations("MergeWithModal");
  const tShare = useTranslations("ShareContactModal");
  const tHeader = useTranslations("PageHeader");
  const tAddress = useTranslations("ContactAddress");
  const tTabs = useTranslations("PersonTabs");
  const tInteractions = useTranslations("InteractionsPage");
  const mergeTexts = useMemo(
    () => ({
      errorTitle: tMerge("ErrorTitle"),
      successTitle: tMerge("SuccessTitle"),
      selectBothPeopleError: tMerge("SelectBothPeopleError"),
      differentPeopleError: tMerge("DifferentPeopleError"),
      mergingTitle: tMerge("MergingTitle"),
      mergingDescription: tMerge("MergingDescription"),
      mergeSuccess: tMerge("MergeSuccess"),
      mergeFailed: tMerge("MergeFailed"),
      mergeWithLabel: tMerge("MergeWithLabel"),
      selectLeftPerson: tMerge("SelectLeftPerson"),
      selectRightPerson: tMerge("SelectRightPerson"),
      searchPeople: tMerge("SearchPeople"),
      noPeopleFound: tMerge("NoPeopleFound"),
      cancel: tMerge("Cancel"),
      continue: tMerge("Continue"),
      back: tMerge("Back"),
      merge: tMerge("Merge"),
      noConflicts: tMerge("NoConflicts"),
      conflictHint: tMerge("ConflictHint"),
      processing: tMerge("Processing"),
      steps: {
        pick: tMerge("Steps.Pick"),
        resolve: tMerge("Steps.Resolve"),
        process: tMerge("Steps.Process"),
      },
      fields: Object.fromEntries(
        MERGE_CONFLICT_FIELDS.map((field) => [field, tMerge(`Fields.${field}`)]),
      ) as Record<MergeConflictField, string>,
    }),
    [tMerge],
  );

  const [contact, setContact] = useState<Contact>(initialContact);
  const [mergeRecommendation, setMergeRecommendation] = useState<MergeRecommendation | null>(
    initialMergeRecommendation,
  );
  const [personGroups, setPersonGroups] = useState<GroupType[]>(initialPersonGroups);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<{
    [key: string]: string;
  }>({});
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [whatsappPrefix, setWhatsappPrefix] = useState("+1");
  const [signalPrefix, setSignalPrefix] = useState("+1");
  const [importantDates, setImportantDates] = useState<ImportantDate[]>(initialImportantDates);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [groupsSaving, setGroupsSaving] = useState(false);
  const [savingLastInteraction, setSavingLastInteraction] = useState(false);

  // Autosave debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always-fresh save callback for Cmd+S handler
  const noteSaveRef = useRef<() => void>(() => {});
  const [relationships, setRelationships] =
    useState<ContactRelationshipWithPeople[]>(initialRelationships);
  const [relationshipsSaving, setRelationshipsSaving] = useState(false);

  // Sync contact state when server data changes (after router.refresh())
  useEffect(() => {
    setContact(initialContact);
  }, [initialContact]);

  // Sync relationships state when server data changes (after router.refresh())
  useEffect(() => {
    setRelationships(initialRelationships);
  }, [initialRelationships]);

  useEffect(() => {
    setPersonGroups(initialPersonGroups);
  }, [initialPersonGroups]);

  const selectablePeople: ContactPreview[] = initialSelectableContacts.map((person) => ({
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    avatar: person.avatar,
  }));
  const currentPersonPreview: ContactPreview = {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    avatar: contact.avatar,
  };

  const mentionableContacts = useMemo<MentionSuggestionItem[]>(() => {
    const seenIds = new Set<string>();

    return [contact, ...initialSelectableContacts]
      .filter((person) => {
        if (!person?.id || seenIds.has(person.id)) {
          return false;
        }

        seenIds.add(person.id);
        return true;
      })
      .map((person) => {
        const label = formatContactName(person).trim();

        return {
          id: person.id,
          label: label.length > 0 ? label : person.id,
          avatar: person.avatar ?? null,
          headline: person.headline ?? null,
          location: person.location ?? null,
        };
      });
  }, [contact, initialSelectableContacts]);

  const mentionSuggestion = useMemo(
    () => createMentionSuggestion(mentionableContacts),
    [mentionableContacts],
  );

  // Initialize edited values when contact loads
  useEffect(() => {
    if (contact) {
      // Initialize phones array
      if (contact.phones && Array.isArray(contact.phones) && contact.phones.length > 0) {
        setPhones(contact.phones as PhoneEntry[]);
      } else {
        setPhones([]);
      }

      // Initialize emails array
      if (contact.emails && Array.isArray(contact.emails) && contact.emails.length > 0) {
        setEmails(contact.emails as EmailEntry[]);
      } else {
        setEmails([]);
      }

      // Parse whatsapp number
      const whatsappParsed = parsePhoneNumber(contact.whatsapp || "");
      if (whatsappParsed) {
        setWhatsappPrefix(whatsappParsed.dialCode);
        setEditedValues((prev) => ({
          ...prev,
          whatsapp: whatsappParsed.number,
        }));
      }

      // Parse signal number
      const signalParsed = parsePhoneNumber(contact.signal || "");
      if (signalParsed) {
        setSignalPrefix(signalParsed.dialCode);
        setEditedValues((prev) => ({
          ...prev,
          signal: signalParsed.number,
        }));
      }

      setEditedValues((prev) => ({
        ...prev,
        firstName: contact.firstName || "",
        middleName: contact.middleName || "",
        lastName: contact.lastName || "",
        headline: contact.headline || "",
        location: contact.location || "",
        notes: contact.notes || "",
        linkedin: contact.linkedin || "",
        instagram: contact.instagram || "",
        facebook: contact.facebook || "",
        website: contact.website || "",
        whatsapp: contact.whatsapp || "",
        signal: contact.signal || "",
      }));
    }
  }, [
    contact?.id,
    contact?.phones,
    contact?.emails,
    contact?.whatsapp,
    contact?.signal,
    contact?.firstName,
    contact?.middleName,
    contact?.lastName,
    contact?.headline,
    contact?.location,
    contact?.notes,
    contact?.linkedin,
    contact?.instagram,
    contact?.facebook,
    contact?.website,
  ]);

  // Initialize rich text editor
  const editor = useEditor({
    extensions: [
      MarkdownPasteExtension,
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Highlight,
      TextStyle,
      Color,
      TaskList,
      TaskItem.extend({
        addNodeView() {
          return ReactNodeViewRenderer(TaskItemNodeView);
        },
      }).configure({ nested: true }),
      Emoji.configure({
        enableEmoticons: true,
        suggestion: emojiSuggestionRender,
      }),
      SlashCommandExtension.configure({
        suggestion: slashCommandSuggestion,
      }),
      Mention.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            avatar: {
              default: null,
              parseHTML: (element) => element.getAttribute("data-avatar"),
              renderHTML: (attributes) => ({
                "data-avatar": attributes.avatar ?? "",
              }),
            },
            headline: {
              default: null,
              parseHTML: (element) => element.getAttribute("data-headline") || null,
              renderHTML: (attributes) => ({
                "data-headline": attributes.headline ?? "",
              }),
            },
            location: {
              default: null,
              parseHTML: (element) => element.getAttribute("data-location") || null,
              renderHTML: (attributes) => ({
                "data-location": attributes.location ?? "",
              }),
            },
          };
        },
        addNodeView() {
          return ReactNodeViewRenderer(MentionNodeView);
        },
      }).configure({
        suggestion: mentionSuggestion,
      }),
      Placeholder.configure({
        placeholder: tPersonPage("NotesPlaceholder"),
      }),
      InlineDateExtension,
    ],
    content: contact?.notes || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        handleSocialSave("notes", editor.getHTML());
      }, 1500);
    },
    onBlur: ({ editor }) => {
      // Flush any pending autosave immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const activeElement = window.document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        activeElement.closest('[data-notes-editor-toolbar="true"]')
      ) {
        return;
      }

      const html = editor.getHTML();
      if (html !== contact?.notes) {
        handleSocialSave("notes", html);
      }
    },
  });

  // Update editor content when contact changes
  useEffect(() => {
    if (editor && contact?.notes !== undefined) {
      editor.commands.setContent(contact.notes || "");
    }
  }, [contact?.notes, editor]);

  const handleContactFieldSave = async (field: string, value: string) => {
    if (!contact || !personId) {
      return;
    }

    const originalValue = contact[field as keyof Contact] || "";
    if (value === originalValue) {
      return;
    }

    const shouldTrackGlobalLoading = field !== "language" && field !== "timezone";
    if (shouldTrackGlobalLoading) {
      setSavingField(field);
    }

    try {
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setContact(
        (previous) =>
          ({
            ...previous,
            [field]: value,
          }) as Contact,
      );

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: `${field === "timezone" ? "Timezone" : "Language"} updated successfully`,
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: `Failed to update ${field === "timezone" ? "timezone" : "language"}`,
        }),
      );
    } finally {
      if (shouldTrackGlobalLoading) {
        setSavingField(null);
      }
    }
  };

  const handleSaveLastInteraction = async (date: string | null) => {
    if (!contact || !personId) return;
    setSavingLastInteraction(true);
    try {
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastInteraction: date }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setContact((prev) => ({ ...prev, lastInteraction: date }) as Contact);
      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: tInteractions("LastInteractionUpdated"),
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: tInteractions("LastInteractionUpdateFailed"),
        }),
      );
    } finally {
      setSavingLastInteraction(false);
    }
  };

  const handleSavePhones = async (phonesOverride?: PhoneEntry[]) => {
    if (!contact || !personId) return;

    // Filter out empty phones and ensure we have both prefix and value
    const sourcePhones = phonesOverride ?? phones;
    const phonesToSave = sourcePhones
      .filter((phone) => phone.value && phone.value.trim() !== "")
      .map((phone) => ({
        ...phone,
        prefix: phone.prefix || "+1",
        value: phone.value.trim(),
      }));

    // Check if changed
    const currentPhones = Array.isArray(contact.phones) ? contact.phones : [];
    if (JSON.stringify(phonesToSave) === JSON.stringify(currentPhones)) {
      return;
    }

    try {
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones: phonesToSave }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setContact({
        ...contact,
        phones: phonesToSave,
      });

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: "Phone numbers updated successfully",
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: "Failed to update phone numbers",
        }),
      );
    }
  };

  const handleSaveEmails = async (emailsOverride?: EmailEntry[]) => {
    if (!contact || !personId) return;

    // Filter out empty emails
    const sourceEmails = emailsOverride ?? emails;
    const emailsToSave = sourceEmails.filter((email) => email.value.trim() !== "");

    // Check if changed
    const currentEmails = Array.isArray(contact.emails) ? contact.emails : [];
    if (JSON.stringify(emailsToSave) === JSON.stringify(currentEmails)) {
      return;
    }

    try {
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: emailsToSave }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setContact({
        ...contact,
        emails: emailsToSave,
      });

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: "Email addresses updated successfully",
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: "Failed to update email addresses",
        }),
      );
    }
  };

  const handleSaveContactInfo = async (payload?: {
    phones?: PhoneEntry[];
    emails?: EmailEntry[];
  }) => {
    const tasks: Promise<void>[] = [];

    if (payload?.phones) {
      tasks.push(handleSavePhones(payload.phones));
    }

    if (payload?.emails) {
      tasks.push(handleSaveEmails(payload.emails));
    }

    if (!tasks.length) {
      tasks.push(handleSavePhones());
      tasks.push(handleSaveEmails());
    }

    await Promise.all(tasks);
  };

  const handleSaveImportantDates = async (datesOverride?: ImportantDate[]) => {
    if (!contact || !personId) return;

    const sourceDates = datesOverride ?? importantDates;
    const datesToSave = sourceDates
      .filter((entry) => entry.date)
      .map((entry) => ({
        id: entry.id,
        type: entry.type,
        date: entry.date,
        note: entry.note,
        notifyDaysBefore: entry.notifyDaysBefore ?? null,
      }));

    setSavingField("importantDates");

    try {
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}/important-dates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: datesToSave }),
      });

      if (!res.ok) throw new Error("Failed to update important dates");

      const data = await res.json();
      const nextDates = (data.dates || []) as ImportantDate[];

      setImportantDates(nextDates);

      notifications.show(
        successNotificationTemplate({
          title: tImportantDates("SuccessTitle"),
          description: tImportantDates("UpdateSuccess"),
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: tImportantDates("ErrorTitle"),
          description: tImportantDates("UpdateError"),
        }),
      );
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveAddress = async (payload: {
    addresses: Contact["addresses"];
    suggestedLocation: {
      location: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
    /** When true, apply the location update immediately without confirmation modal */
    forceLocation?: boolean;
    /** When true, skip the address save — only update the location field */
    locationOnly?: boolean;
    /** When true, skip address + location save — only update the timezone field */
    timezoneOnly?: boolean;
    /** IANA timezone string to save (used together with timezoneOnly) */
    timezone?: string;
  }) => {
    if (!contact || !personId) return;

    // Timezone-only path: delegate to the generic field save helper and return early.
    if (payload.timezoneOnly && payload.timezone) {
      await handleContactFieldSave("timezone", payload.timezone);
      return;
    }

    setSavingField("address");

    // Location-only path: skip address PATCH and the "Addresses updated" notification,
    // resolve the matching address entry for field population, then go straight to
    // the location update (always forced — no confirmation modal).
    if (payload.locationOnly && payload.suggestedLocation) {
      const addressEntries = Array.isArray(payload.addresses)
        ? payload.addresses.filter(
            (entry): entry is ContactAddressEntry =>
              typeof entry === "object" && entry !== null && !Array.isArray(entry),
          )
        : [];
      const preferredAddress =
        addressEntries.length > 0
          ? addressEntries.find((entry) => entry.type === "home") || addressEntries[0]
          : null;
      const locationAddress =
        addressEntries.find((entry) => entry.value === payload.suggestedLocation?.location) ??
        preferredAddress;
      try {
        const locationResponse = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: payload.suggestedLocation.location,
            latitude: payload.suggestedLocation.latitude,
            longitude: payload.suggestedLocation.longitude,
          }),
        });
        if (!locationResponse.ok) throw new Error("Failed to update location");
        setContact((previous) => ({
          ...previous,
          location: payload.suggestedLocation?.location ?? null,
          latitude: payload.suggestedLocation?.latitude ?? null,
          longitude: payload.suggestedLocation?.longitude ?? null,
        }));
        notifications.show(
          successNotificationTemplate({
            title: tAddress("LocationUpdateSuccessTitle"),
            description: tAddress("LocationUpdateSuccessMessage"),
          }),
        );

        // After the location saved, offer to also update the timezone
        const lat = payload.suggestedLocation?.latitude;
        const lon = payload.suggestedLocation?.longitude;
        if (lat != null && lon != null) {
          openStandardConfirmModal({
            title: (
              <ModalTitle
                text={tAddress("TimezoneUpdateModalTitle")}
                icon={<IconClock size={18} />}
              />
            ),
            message: <Text size="sm">{tAddress("TimezoneUpdateModalMessage")}</Text>,
            confirmLabel: tAddress("LocationUpdateConfirm"),
            cancelLabel: tAddress("LocationUpdateCancel"),
            onConfirm: async () => {
              setSavingField("address");
              try {
                const rawTz = await getTimezoneForCoordinates(lat, lon).catch(() => null);
                const canonical = rawTz ? resolveToCanonicalTimezone(rawTz) : null;
                if (!canonical) {
                  notifications.show(
                    errorNotificationTemplate({
                      title: tAddress("SetAsTimezoneError"),
                      description: "",
                    }),
                  );
                  return;
                }
                const tzRes = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ timezone: canonical }),
                });
                if (!tzRes.ok) throw new Error("Failed to update timezone");
                setContact((previous) => ({ ...previous, timezone: canonical }));
                notifications.show(
                  successNotificationTemplate({
                    title: tAddress("SetAsTimezoneSuccess"),
                    description: "",
                  }),
                );
              } catch {
                notifications.show(
                  errorNotificationTemplate({
                    title: tAddress("SetAsTimezoneError"),
                    description: "",
                  }),
                );
              } finally {
                setSavingField(null);
              }
            },
          });
        }
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: tAddress("LocationUpdateErrorTitle"),
            description: tAddress("LocationUpdateErrorMessage"),
          }),
        );
      } finally {
        setSavingField(null);
      }
      return;
    }

    try {
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: payload.addresses }),
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => null);
        const serverMessage =
          errorPayload && typeof errorPayload === "object"
            ? ((errorPayload as Record<string, unknown>).error as string) ||
              ((errorPayload as Record<string, unknown>).message as string)
            : null;
        throw new Error(serverMessage || "Failed to update address");
      }

      const addressEntries = Array.isArray(payload.addresses)
        ? payload.addresses.filter(
            (entry): entry is ContactAddressEntry =>
              typeof entry === "object" && entry !== null && !Array.isArray(entry),
          )
        : [];

      const preferredAddress =
        addressEntries.length > 0
          ? addressEntries.find((entry) => entry.type === "home") || addressEntries[0]
          : null;

      // Find the address entry that matches the suggested location (the one that was created/updated)
      const locationAddress = payload.suggestedLocation
        ? (addressEntries.find((entry) => entry.value === payload.suggestedLocation?.location) ??
          preferredAddress)
        : preferredAddress;

      // Only update the addresses list in state here — all location-related
      // fields (location, addressLine1, lat/lng, etc.) are written only after
      // the user confirms the location update modal below.
      setContact((previous) => ({
        ...previous,
        addresses: payload.addresses,
      }));

      notifications.show(
        successNotificationTemplate({
          title: tAddress("SaveSuccessTitle"),
          description: tAddress("SaveSuccessMessage"),
        }),
      );

      if (payload.suggestedLocation) {
        const applyLocationUpdate = async () => {
          setSavingField("address");
          try {
            const lat = payload.suggestedLocation?.latitude;
            const lon = payload.suggestedLocation?.longitude;

            // Detect timezone from coordinates in parallel, non-blocking
            let canonicalTimezone: string | null = null;
            if (lat != null && lon != null) {
              const rawTz = await getTimezoneForCoordinates(lat, lon).catch(() => null);
              if (rawTz) canonicalTimezone = resolveToCanonicalTimezone(rawTz);
            }

            const locationPatch: Record<string, unknown> = {
              location: payload.suggestedLocation?.location,
              latitude: lat,
              longitude: lon,
            };
            if (canonicalTimezone) {
              locationPatch.timezone = canonicalTimezone;
            }

            const locationResponse = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(locationPatch),
            });
            if (!locationResponse.ok) {
              throw new Error("Failed to update location");
            }
            setContact((previous) => ({
              ...previous,
              location: payload.suggestedLocation?.location ?? null,
              latitude: payload.suggestedLocation?.latitude ?? null,
              longitude: payload.suggestedLocation?.longitude ?? null,
              ...(canonicalTimezone ? { timezone: canonicalTimezone } : {}),
            }));
            notifications.show(
              successNotificationTemplate({
                title: tAddress("LocationUpdateSuccessTitle"),
                description: tAddress("LocationUpdateSuccessMessage"),
              }),
            );
          } catch {
            notifications.show(
              errorNotificationTemplate({
                title: tAddress("LocationUpdateErrorTitle"),
                description: tAddress("LocationUpdateErrorMessage"),
              }),
            );
          } finally {
            setSavingField(null);
          }
        };

        if (payload.forceLocation) {
          void applyLocationUpdate();
        } else {
          openStandardConfirmModal({
            title: (
              <ModalTitle
                text={tAddress("LocationUpdateModalTitle")}
                icon={<IconMapPin size={18} />}
              />
            ),
            message: <Text size="sm">{tAddress("LocationUpdateModalMessage")}</Text>,
            confirmLabel: tAddress("LocationUpdateConfirm"),
            cancelLabel: tAddress("LocationUpdateCancel"),
            onConfirm: applyLocationUpdate,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : tAddress("SaveErrorMessage");
      notifications.show(
        errorNotificationTemplate({
          title: tAddress("SaveErrorTitle"),
          description: message,
        }),
      );
    } finally {
      setSavingField(null);
    }
  };

  const handleSocialSave = async (field: string, value: string) => {
    if (!contact || !personId) return;

    // Extract username from URL if applicable
    let processedValue = value;
    if (["linkedin", "instagram", "facebook", "whatsapp"].includes(field)) {
      processedValue = extractUsername(field, value);
    }

    // Handle whatsapp and signal - combine with prefix
    if (field === "whatsapp") {
      processedValue = combinePhoneNumber(whatsappPrefix, value);
    } else if (field === "signal") {
      processedValue = combinePhoneNumber(signalPrefix, value);
    }

    // Check if value actually changed
    const originalValue = contact[field as keyof Contact] || "";
    if (processedValue === originalValue) {
      return;
    }

    // Validation
    if (field === "firstName" && (!processedValue || processedValue.trim() === "")) {
      notifications.show(
        errorNotificationTemplate({
          title: "Validation Error",
          description: "First name is required",
        }),
      );
      // Revert to original value
      setEditedValues((prev) => ({
        ...prev,
        [field]: originalValue as string,
      }));
      return;
    }

    setSavingField(field);

    try {
      // In a real app, you'd call your API here:
      const res = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: processedValue }),
      });

      if (!res.ok) throw new Error("Failed to update");

      // Update local state with username
      setContact({
        ...contact,
        [field]: processedValue,
        ...(field === "notes" ? { notesUpdatedAt: new Date().toISOString() } : {}),
      });

      const fieldDisplayName = field.charAt(0).toUpperCase() + field.slice(1);

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: `${fieldDisplayName} updated successfully`,
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: `Failed to update ${field}`,
        }),
      );
    } finally {
      setSavingField(null);
    }
  };

  const handleBlur = (field: string) => {
    const value = editedValues[field] || "";
    handleSocialSave(field, value);
  };

  // Keep noteSaveRef fresh for Cmd+S (assigned in render body — always latest closure)
  noteSaveRef.current = () => {
    if (!editor) return;
    // Flush pending debounce timer immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      handleSocialSave("notes", editor.getHTML());
      return;
    }
    const html = editor.getHTML();
    if (html === (contact?.notes || "")) {
      // Content already saved — give brief confirmation
      notifications.show(
        successNotificationTemplate({
          title: tPersonPage("NotesSaved"),
          description: tPersonPage("NotesAlreadySaved"),
        }),
      );
      return;
    }
    handleSocialSave("notes", html);
  };

  // Cmd+S / Ctrl+S — save notes immediately
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        noteSaveRef.current();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleContactFieldBlur = (field: string, value: string) => {
    handleContactFieldSave(field, value);
  };

  const openAddToGroupsModal = () => {
    openAddPeopleToGroupSelectionModal({
      personIds: [personId],
      onUpdated: async () => {
        try {
          const response = await fetch(`${API_ROUTES.CONTACTS}/${personId}/groups`);
          if (!response.ok) {
            return;
          }

          const payload = (await response.json()) as { groups?: GroupType[] };
          setPersonGroups(payload.groups || []);
        } catch {
          // Keep existing state if groups refresh fails
        }
      },
    });
  };

  const handleAddRelationship = async (
    relationshipType: RelationshipType,
    relatedPersonId: string,
  ) => {
    setRelationshipsSaving(true);

    try {
      const response = await fetch(`${API_ROUTES.CONTACTS}/${personId}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipType, relatedPersonId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || tRelationships("CreateError"));
      }

      await revalidateRelationships();
      router.refresh();

      notifications.show(
        successNotificationTemplate({
          title: tRelationships("SuccessTitle"),
          description: tRelationships("CreateSuccess"),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: tRelationships("ErrorTitle"),
          description: error instanceof Error ? error.message : tRelationships("CreateError"),
        }),
      );
    } finally {
      setRelationshipsSaving(false);
    }
  };

  const handleDeleteRelationship = async (relationshipId: string) => {
    setRelationshipsSaving(true);

    try {
      const response = await fetch(
        `${API_ROUTES.CONTACTS}/${personId}/relationships/${relationshipId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || tRelationships("DeleteError"));
      }

      setRelationships((previous) =>
        previous.filter((relationship) => relationship.id !== relationshipId),
      );

      await revalidateRelationships();

      notifications.show(
        successNotificationTemplate({
          title: tRelationships("SuccessTitle"),
          description: tRelationships("DeleteSuccess"),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: tRelationships("ErrorTitle"),
          description: error instanceof Error ? error.message : tRelationships("DeleteError"),
        }),
      );
    } finally {
      setRelationshipsSaving(false);
    }
  };

  const handleUpdateRelationship = async (
    relationshipId: string,
    relationshipType: RelationshipType,
    relatedPersonId: string,
  ) => {
    setRelationshipsSaving(true);

    try {
      const response = await fetch(
        `${API_ROUTES.CONTACTS}/${personId}/relationships/${relationshipId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relationshipType, relatedPersonId }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || tRelationships("UpdateError"));
      }

      await revalidateRelationships();
      router.refresh();

      notifications.show(
        successNotificationTemplate({
          title: tRelationships("SuccessTitle"),
          description: tRelationships("UpdateSuccess"),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: tRelationships("ErrorTitle"),
          description: error instanceof Error ? error.message : tRelationships("UpdateError"),
        }),
      );
    } finally {
      setRelationshipsSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    // Parse full phone number if pasted (for WhatsApp and Signal only)
    if (field === "whatsapp" || field === "signal") {
      const parsed = parsePhoneNumber(value);
      if (parsed && value.includes("+")) {
        // User pasted a full number with prefix
        if (field === "whatsapp") {
          setWhatsappPrefix(parsed.dialCode);
          setEditedValues((prev) => ({
            ...prev,
            [field]: parsed.number,
          }));
        } else if (field === "signal") {
          setSignalPrefix(parsed.dialCode);
          setEditedValues((prev) => ({
            ...prev,
            [field]: parsed.number,
          }));
        }
        return;
      }
    }

    setEditedValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openDeleteModal = () =>
    openDeleteContactModal({
      contactId: personId,
      contactName: formatContactName(contact),
      onDeleted: async () => {
        await revalidateContacts();
        router.push(WEBAPP_ROUTES.PEOPLE);
      },
    });

  const openMergeWithModalForCurrentPerson = () => {
    const mergeContacts = [contact, ...initialSelectableContacts].reduce<Contact[]>((acc, item) => {
      if (!acc.some((existing) => existing.id === item.id)) {
        acc.push(item);
      }
      return acc;
    }, []);

    openMergeWithModal({
      contacts: mergeContacts,
      leftPersonId: contact.id,
      disableLeftPicker: true,
      titleText: tMerge("ModalTitle"),
      texts: mergeTexts,
    });
  };

  const openShareModal = () => {
    openShareContactModal({
      contact,
      texts: {
        modalTitle: tShare("ModalTitle"),
        recipientEmailLabel: tShare("RecipientEmailLabel"),
        recipientEmailPlaceholder: tShare("RecipientEmailPlaceholder"),
        recipientsLabel: tShare("RecipientsLabel"),
        recipientsPlaceholder: tShare("RecipientsPlaceholder"),
        messageLabel: tShare("MessageLabel"),
        messagePlaceholder: tShare("MessagePlaceholder"),
        sendCopyCheckbox: tShare("SendCopyCheckbox"),
        selectFieldsLabel: tShare("SelectFieldsLabel"),
        submitButton: (count: number) =>
          count > 0 ? tShare("SubmitButtonWithCount", { count }) : tShare("SubmitButton"),
        cancelButton: tShare("CancelButton"),
        sendingButton: tShare("SendingButton"),
        successTitle: tShare("SuccessTitle"),
        successDescription: tShare("SuccessDescription"),
        errorTitle: tShare("ErrorTitle"),
        errorDescription: tShare("ErrorDescription"),
        noFieldsSelectedError: tShare("NoFieldsSelectedError"),
        invalidEmailError: tShare("InvalidEmailError"),
        invalidEmailsError: tShare("InvalidEmailsError"),
        maxRecipientsError: tShare("MaxRecipientsError"),
        noRecipientsError: tShare("NoRecipientsError"),
        requiredFieldTooltip: tShare("RequiredFieldTooltip"),
        avatarRequiredTooltip: tShare("AvatarRequiredTooltip"),
        avatarDescription: (name: string) => tShare("AvatarDescription", { name }),
        fieldLabels: {
          name: tShare("Fields.name"),
          avatar: tShare("Fields.avatar"),
          headline: tShare("Fields.headline"),
          phones: tShare("Fields.phones"),
          emails: tShare("Fields.emails"),
          location: tShare("Fields.location"),
          linkedin: tShare("Fields.linkedin"),
          instagram: tShare("Fields.instagram"),
          facebook: tShare("Fields.facebook"),
          website: tShare("Fields.website"),
          whatsapp: tShare("Fields.whatsapp"),
          signal: tShare("Fields.signal"),
          addresses: tShare("Fields.addresses"),
          notes: tShare("Fields.notes"),
          importantDates: tShare("Fields.importantDates"),
        },
      },
    });
  };

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          icon={IconUser}
          title={"Person's details"}
          backOnClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
              return;
            }
            router.push(WEBAPP_ROUTES.PEOPLE);
          }}
          action={
            <ContactActionMenu
              contact={contact}
              personId={personId}
              onDelete={openDeleteModal}
              onMergeWith={openMergeWithModalForCurrentPerson}
              onShare={openShareModal}
            />
          }
        />

        <RecommendationsSection
          mergeRecommendation={mergeRecommendation}
          mergeTexts={mergeTexts}
          onMergeAccepted={() => setMergeRecommendation(null)}
          onMergeDeclined={() => setMergeRecommendation(null)}
          showEnrichCard={!!contact.linkedin && !initialSyncedAt}
          personId={personId}
          linkedinHandle={contact.linkedin ?? null}
        />

        <Paper withBorder shadow="sm" radius="md" p="xl">
          <Stack gap="lg">
            {/* Always-visible: identity + notes */}
            <ContactIdentitySection
              contact={contact}
              personId={personId}
              phones={phones}
              emails={emails}
              savingField={savingField}
              onPhonesChange={setPhones}
              onEmailsChange={setEmails}
              onSaveContactInfo={handleSaveContactInfo}
            />

            <ContactNotesSection
              editor={editor}
              savingField={savingField}
              notesUpdatedAt={contact.notesUpdatedAt}
            />

            {/* Tabbed sections */}
            <Tabs value={activeTab} onChange={handleTabChange} keepMounted={false}>
              <Tabs.List>
                <Tabs.Tab value="interactions" leftSection={<IconCalendarEvent size={16} />}>
                  {tTabs("Interactions")}
                </Tabs.Tab>
                <Tabs.Tab value="about" leftSection={<IconUserCircle size={16} />}>
                  {tTabs("About")}
                </Tabs.Tab>
                <Tabs.Tab value="organize" leftSection={<IconTags size={16} />}>
                  {tTabs("Organize")}
                </Tabs.Tab>
                <Tabs.Tab value="linkedin" leftSection={<IconBrandLinkedin size={16} />}>
                  {tTabs("LinkedIn")}
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="interactions" pt="md">
                <Stack gap="lg">
                  <DatePickerWithPresets
                    label={tInteractions("LastInteractionInput")}
                    value={contact.lastInteraction ?? null}
                    disabled={savingLastInteraction}
                    className="max-w-60"
                    onChange={(val) => {
                      const date = val as Date | string | null;
                      const dateStr = !date
                        ? null
                        : date instanceof Date
                          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                          : (String(date).split("T")[0] ?? null);
                      handleSaveLastInteraction(dateStr);
                    }}
                  />
                  <Stack gap="xs">
                    <Text fw={600} size="sm">
                      Interactions
                    </Text>
                    <Button
                      variant="light"
                      size="xs"
                      style={{ alignSelf: "flex-start" }}
                      leftSection={<IconPlus size={16} />}
                      onClick={() => {
                        openNewActivityModal({
                          contacts: [contact, ...initialSelectableContacts].filter(
                            (item, index, self) =>
                              self.findIndex((other) => other.id === item.id) === index,
                          ),
                          initialParticipantIds: [contact.id],
                          titleText: tInteractions("WhoAreYouMeeting"),
                          t: tInteractions,
                        });
                      }}
                    >
                      {tInteractions("AddActivity")}
                    </Button>
                    <PersonInteractionsSection
                      activities={initialActivities}
                      contact={contact}
                      connectedContacts={initialConnectedContacts || []}
                      selectableContacts={initialSelectableContacts || []}
                    />
                  </Stack>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="about" pt="md">
                <Stack gap="lg">
                  <ContactImportantDatesSection
                    dates={importantDates}
                    personFirstName={contact.firstName}
                    savingField={savingField}
                    onDatesChange={setImportantDates}
                    onSave={handleSaveImportantDates}
                  />

                  <ContactRelationshipsSection
                    currentPerson={currentPersonPreview}
                    selectablePeople={selectablePeople}
                    relationships={relationships}
                    isSubmitting={relationshipsSaving}
                    onAddRelationship={handleAddRelationship}
                    onUpdateRelationship={handleUpdateRelationship}
                    onDeleteRelationship={handleDeleteRelationship}
                  />

                  <ContactPreferenceSection
                    contact={contact}
                    savingField={savingField}
                    handleBlur={handleContactFieldBlur}
                  />

                  <ContactAddressSection
                    contact={contact}
                    isSaving={savingField === "address"}
                    onSave={handleSaveAddress}
                  />
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="organize" pt="md">
                <Stack gap="lg">
                  <PersonTagsInput
                    personId={personId}
                    initialTags={initialPersonTags}
                    allTags={initialAllTags}
                  />

                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      Groups
                    </Text>
                    <Group gap="sm" align="flex-start" wrap="wrap">
                      {personGroups.map((group) => (
                        <GroupCard
                          key={group.id}
                          group={{
                            ...(group as GroupWithCount),
                            contactCount: 1,
                            previewContacts: [currentPersonPreview],
                          }}
                          onClick={(groupId) => router.push(`/app/group/${groupId}`)}
                          onAddPeople={() => {}}
                          onEdit={() => {}}
                          onDuplicate={() => {}}
                          onDelete={() => {}}
                          interactive={true}
                          variant="small"
                          showMenu={false}
                          shadow="none"
                        />
                      ))}

                      <GroupCard
                        variant="action"
                        actionLabel="Edit groups"
                        shadow="none"
                        interactive={!groupsSaving}
                        cursorType={groupsSaving ? "default" : "pointer"}
                        onActionClick={openAddToGroupsModal}
                      />
                    </Group>
                  </Stack>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="linkedin" pt="md">
                <LinkedInTab
                  workHistory={initialWorkHistory}
                  education={initialEducation}
                  linkedinBio={initialLinkedinBio}
                  syncedAt={initialSyncedAt}
                  onEnrich={() => startForPerson(personId, contact.linkedin)}
                  enrichLabel={tEnrich("MenuLabel")}
                />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
