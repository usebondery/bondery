import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconMail,
  IconMessage,
  IconPencil,
  IconPhone,
  IconTrash,
} from "@tabler/icons-react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import { expandPersonMentionsForEditor, htmlToMarkdown, parsePersonMentionUrl } from "@bondery/helpers/notes";
import type {
  Contact,
  ContactAddressEntry,
  EmailEntry,
  Group,
  GroupWithCount,
  ImportantDate,
  PhoneEntry,
  Tag,
  TagWithCount,
} from "@bondery/schemas";
import type { ContactSocialFieldKey } from "@bondery/helpers";
import { firstZodErrorMessage, replaceImportantDatesSchema } from "@bondery/schemas";
import {
  deleteContacts,
  fetchContact,
  fetchContactGroups,
  fetchContactImportantDates,
  fetchContactTags,
  fetchMyselfContact,
  replaceImportantDates,
  updateContact,
  type ImportantDateInput,
} from "../../lib/api/client";
import { ActionSheetPopup } from "../../components/ActionSheetPopup";
import { LoadErrorCard, loadErrorStackInset } from "../../components/load-state";
import { StackNavBar } from "../../components/chrome";
import {
  NOTES_COLLAPSE_CHAR_THRESHOLD,
  normalizeMobileUrlForDevice,
} from "../../lib/config";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { useContactsStore } from "../../lib/store";
import {
  ShareUnavailableError,
  shareContactVCard,
} from "../../lib/share/shareContactVCard";
import { useAppToast } from "../../lib/toast/useAppToast";
import { ScalePressable } from "../../theme/ScalePressable";
import {
  MOBILE_LAYOUT,
  MOBILE_TYPOGRAPHY,
} from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ContactAddressesSection } from "./components/ContactAddressesSection";
import { ContactDetailOverflowMenu } from "./components/ContactDetailOverflowMenu";
import { ShareContactEmailSheet } from "./ShareContactEmailSheet";
import { ContactEmailsSection } from "./components/ContactEmailsSection";
import { ContactGroupsSection } from "./components/ContactGroupsSection";
import { ContactTagsSection } from "./components/ContactTagsSection";
import { ContactPhonesSection } from "./components/ContactPhonesSection";
import { ContactSocialSection } from "./components/ContactSocialSection";
import { ContactImportantDatesSection } from "./components/ContactImportantDatesSection";
import { EditIdentitySheet } from "./components/EditIdentitySheet";
import { ContactDetailSectionHeader } from "./components/ContactDetailSectionHeader";
import { contactDetailStyles } from "./components/contactDetailStyles";
import {
  normalizeEmailsForSave,
  normalizePhonesForSave,
} from "./contactChannelConstants";
import {
  formatAbsoluteDate,
  formatContactLocation,
  formatContactName,
  formatRelativeDate,
  getAvatarColorHex,
  getContactAddresses,
  getContactInitials,
  parseContactEmails,
  parseContactPhones,
} from "./contactUtils";
import { useMentionableContacts } from "./hooks/useMentionableContacts";

interface ContactDetailScreenProps {
  id?: string;
  isMyselfMode?: boolean;
}

export function ContactDetailScreen({
  id,
  isMyselfMode = false,
}: ContactDetailScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useMobileThemeColors();
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const upsertContact = useContactsStore((state) => state.upsertContact);
  const removeContact = useContactsStore((state) => state.removeContact);
  const contact = useContactsStore((state) => {
    if (isMyselfMode) {
      return state.myselfContactId ? state.byId[state.myselfContactId] ?? null : null;
    }

    if (!id) {
      return null;
    }

    return state.byId[id] ?? null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isShareEmailSheetOpen, setShareEmailSheetOpen] = useState(false);
  const [isIdentitySheetOpen, setIdentitySheetOpen] = useState(false);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [memberGroups, setMemberGroups] = useState<GroupWithCount[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [memberTags, setMemberTags] = useState<TagWithCount[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsError, setTagsError] = useState<string | null>(null);

  const {
    contacts: mentionableContacts,
    myselfContactId,
    getContactName,
  } = useMentionableContacts({
    contactId: contact?.id ?? id ?? null,
    isMyselfMode,
  });

  const loadContactImportantDates = useCallback(async (contactId: string) => {
    try {
      const { dates } = await fetchContactImportantDates(contactId);
      setImportantDates(dates);
    } catch {
      setImportantDates([]);
    }
  }, []);

  const loadContactTags = useCallback(async (contactId: string) => {
    setTagsLoading(true);
    setTagsError(null);

    try {
      const { tags } = await fetchContactTags(contactId);
      setMemberTags(tags);
    } catch (err) {
      setTagsError(
        err instanceof Error ? err.message : t("MobileApp.ContactDetail.TagsLoadError"),
      );
    } finally {
      setTagsLoading(false);
    }
  }, [t]);

  const loadContactGroups = useCallback(async (contactId: string) => {
    setGroupsLoading(true);
    setGroupsError(null);

    try {
      const { groups } = await fetchContactGroups(contactId);
      setMemberGroups(groups);
    } catch (err) {
      setGroupsError(
        err instanceof Error ? err.message : t("MobileApp.ContactDetail.GroupsLoadError"),
      );
    } finally {
      setGroupsLoading(false);
    }
  }, [t]);

  const loadContact = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isMyselfMode && !id) {
      setError("Contact not found");
      setLoading(false);
      return;
    }

    try {
      const { contact: loadedContact } = await (isMyselfMode
        ? fetchMyselfContact()
        : fetchContact(id as string));
      upsertContact(loadedContact);
      void loadContactImportantDates(loadedContact.id);
      void loadContactTags(loadedContact.id);
      if (!isMyselfMode) {
        void loadContactGroups(loadedContact.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contact");
    } finally {
      setLoading(false);
    }
  }, [
    id,
    isMyselfMode,
    loadContactGroups,
    loadContactImportantDates,
    loadContactTags,
    upsertContact,
  ]);

  useEffect(() => {
    void loadContact();
  }, [loadContact]);

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [contact?.avatar]);

  const notesMarkdown = useMemo(() => {
    const raw = htmlToMarkdown(contact?.notes ?? "");
    if (!contact) {
      return raw;
    }
    return expandPersonMentionsForEditor(raw, getContactName);
  }, [contact, getContactName]);

  const handleMentionLinkPress = useCallback(
    ({ url }: { url: string }) => {
      const personId = parsePersonMentionUrl(url);
      if (!personId) {
        return;
      }

      const isKnownContact = mentionableContacts.some((item) => item.id === personId);
      if (!isKnownContact) {
        showToast({ type: "error", headline: "Contact no longer available" });
        return;
      }

      if (myselfContactId && personId === myselfContactId) {
        router.push("/myself");
        return;
      }

      router.push(`/contact/${personId}`);
    },
    [mentionableContacts, myselfContactId, router, showToast],
  );

  if (loading || error || !contact) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
        <StackNavBar onBack={() => router.back()} />
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
          </View>
        ) : (
          <View style={loadErrorStackInset}>
            <LoadErrorCard
              title={t("MobileApp.Settings.LoadErrorTitle")}
              description={error ?? t("MobileApp.Common.UnknownError")}
              onRetry={() => {
                void loadContact();
              }}
            />
          </View>
        )}
      </View>
    );
  }

  const activeContact = contact;
  const phones = parseContactPhones(activeContact);
  const emails = parseContactEmails(activeContact);
  const addresses = getContactAddresses(activeContact);
  const initials = getContactInitials(activeContact);
  const avatarColor = getAvatarColorHex(activeContact);
  const avatarUri = activeContact.avatar
    ? normalizeMobileUrlForDevice(activeContact.avatar)
    : null;
  const shouldShowAvatarImage = Boolean(avatarUri) && !avatarImageFailed;
  const name = formatContactName(activeContact);
  const locationLabel = formatContactLocation(activeContact);

  const primaryPhone = phones.find((phone) => phone.preferred) ?? phones[0];
  const primaryEmail = emails.find((email) => email.preferred) ?? emails[0];

  function shareContact() {
    void (async () => {
      setIsSharing(true);

      try {
        await shareContactVCard({
          contactId: activeContact.id,
          contact: activeContact,
          dialogTitle: name,
        });
      } catch (err) {
        if (err instanceof ShareUnavailableError) {
          showToast({
            type: "error",
            headline: t("MobileApp.ContactDetail.ShareUnavailable"),
          });
          return;
        }

        showToast({
          type: "error",
          headline: t("MobileApp.ContactDetail.ShareFailed"),
          description: t("MobileApp.ContactDetail.ShareFailedDescription"),
        });
      } finally {
        setIsSharing(false);
      }
    })();
  }

  function handleDeleteContact() {
    void (async () => {
      setIsDeleting(true);

      try {
        await deleteContacts([activeContact.id]);
        removeContact(activeContact.id);
        setDeleteConfirmOpen(false);
        router.back();
      } catch {
        showToast({
          type: "error",
          headline: t("MobileApp.Common.ErrorTitle"),
          description: t("MobileApp.ContactDetail.DeleteFailed"),
        });
      } finally {
        setIsDeleting(false);
      }
    })();
  }

  async function handleUpdateSocial(
    platform: ContactSocialFieldKey,
    value: string,
  ) {
    const { contact: updated } = await updateContact(activeContact.id, {
      [platform]: value,
    });
    upsertContact(updated);
  }

  async function handleSavePhones(nextPhones: PhoneEntry[]) {
    const { contact: updated } = await updateContact(activeContact.id, {
      phones: normalizePhonesForSave(nextPhones),
    });
    upsertContact(updated);
  }

  async function handleSaveEmails(nextEmails: EmailEntry[]) {
    const { contact: updated } = await updateContact(activeContact.id, {
      emails: normalizeEmailsForSave(nextEmails),
    });
    upsertContact(updated);
  }

  async function handleSaveAddresses(nextAddresses: ContactAddressEntry[]) {
    const { contact: updated } = await updateContact(activeContact.id, {
      addresses: nextAddresses,
    });
    upsertContact(updated);
  }

  function openPhone(phone: PhoneEntry) {
    Linking.openURL(`tel:${phone.prefix}${phone.value}`).catch(() => {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: "Could not open phone dialer",
      });
    });
  }

  function openSms(phone: PhoneEntry) {
    Linking.openURL(`sms:${phone.prefix}${phone.value}`).catch(() => {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: "Could not open messages",
      });
    });
  }

  function openEmail(email: EmailEntry) {
    Linking.openURL(`mailto:${email.value}`).catch(() => {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: "Could not open email app",
      });
    });
  }

  async function handleSaveImportantDates(nextDates: ImportantDate[]) {
    const payload: ImportantDateInput[] = nextDates
      .filter((entry) => entry.date)
      .map((entry) => ({
        id: entry.id || undefined,
        type: entry.type,
        date: entry.date,
        note: entry.note,
        notifyDaysBefore: entry.notifyDaysBefore ?? null,
      }));

    const parsed = replaceImportantDatesSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(firstZodErrorMessage(parsed.error));
    }

    const { dates } = await replaceImportantDates(activeContact.id, parsed.data);
    setImportantDates(dates);
    upsertContact({ ...activeContact, importantDates: dates });
  }

  const hasInfo = Boolean(contact.lastInteraction);
  const longNotes = notesMarkdown.length > NOTES_COLLAPSE_CHAR_THRESHOLD;

  function openNotesEditor() {
    if (isMyselfMode) {
      router.push("/myself/notes");
    } else {
      router.push(`/contact/${activeContact.id}/notes`);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <StackNavBar
        onBack={() => router.back()}
        right={
          <ContactDetailOverflowMenu
            isMyselfMode={isMyselfMode}
            isBusy={isDeleting || isSharing}
            onShare={shareContact}
            onShareViaEmail={() => setShareEmailSheetOpen(true)}
            onDelete={() => setDeleteConfirmOpen(true)}
          />
        }
      />

      <ActionSheetPopup
        open={isDeleteConfirmOpen}
        title={t("MobileApp.ContactDetail.DeleteContactConfirmTitle").replace(
          "{name}",
          name,
        )}
        isBusy={isDeleting}
        onOpenChange={setDeleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        actions={[
          {
            label: t("MobileApp.Common.Cancel"),
            onPress: () => setDeleteConfirmOpen(false),
            disabled: isDeleting,
            tone: "neutral",
            variant: "outline",
          },
          {
            label: t("MobileApp.Common.Delete"),
            icon: <IconTrash size={16} color={colors.textOnPrimary} />,
            onPress: handleDeleteContact,
            loading: isDeleting,
            disabled: isDeleting,
            tone: "danger",
            variant: "filled",
          },
        ]}
      />

      <ShareContactEmailSheet
        open={isShareEmailSheetOpen}
        contactId={activeContact.id}
        contactName={name}
        onOpenChange={setShareEmailSheetOpen}
        onClose={() => setShareEmailSheetOpen(false)}
      />

      <EditIdentitySheet
        open={isIdentitySheetOpen}
        contact={activeContact}
        isMyselfMode={isMyselfMode}
        onOpenChange={setIdentitySheetOpen}
        onClose={() => setIdentitySheetOpen(false)}
        onContactUpdated={upsertContact}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={contactDetailStyles.sectionHeaderRow}>
            <View style={styles.heroHeaderSpacer} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("MobileApp.ContactIdentity.EditProfile")}
              onPress={() => setIdentitySheetOpen(true)}
              style={contactDetailStyles.sectionHeaderAction}
            >
              <IconPencil size={16} stroke={colors.primary} />
              <Text
                style={[
                  contactDetailStyles.sectionHeaderActionText,
                  { color: colors.primary },
                ]}
              >
                {t("ContactInfo.EditAction")}
              </Text>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: colors.surfacePressed },
                !shouldShowAvatarImage && { backgroundColor: avatarColor },
              ]}
            >
              {shouldShowAvatarImage ? (
                <Image
                  source={{ uri: avatarUri || undefined }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                  onError={() => setAvatarImageFailed(true)}
                />
              ) : (
                <Text
                  style={[styles.avatarInitial, { color: colors.textOnPrimary }]}
                >
                  {initials}
                </Text>
              )}
            </View>
            <Text style={[styles.heroName, { color: colors.textPrimary }]}>
              {name}
            </Text>
            {contact.headline ? (
              <Text
                style={[styles.heroHeadline, { color: colors.textSecondary }]}
              >
                {contact.headline}
              </Text>
            ) : null}
            {locationLabel ? (
              <Text style={[styles.heroPlace, { color: colors.textMuted }]}>
                {locationLabel}
              </Text>
            ) : null}
          </View>
        </View>

        {phones.length > 0 || emails.length > 0 ? (
          <View
            style={[styles.quickActions, { borderBottomColor: colors.border }]}
          >
            {phones.length > 0 ? (
              <ScalePressable
                style={styles.actionButton}
                accessibilityLabel={t("MobileApp.Common.Call")}
                onPress={() => openPhone(primaryPhone!)}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: colors.surfacePressed },
                  ]}
                >
                  <IconPhone size={20} stroke={colors.iconPrimary} />
                </View>
              </ScalePressable>
            ) : null}
            {phones.length > 0 ? (
              <ScalePressable
                style={styles.actionButton}
                accessibilityLabel={t("MobileApp.Common.Message")}
                onPress={() => openSms(primaryPhone!)}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: colors.surfacePressed },
                  ]}
                >
                  <IconMessage size={20} stroke={colors.iconPrimary} />
                </View>
              </ScalePressable>
            ) : null}
            {emails.length > 0 ? (
              <ScalePressable
                style={styles.actionButton}
                accessibilityLabel={t("ContactInfo.SendEmailAction")}
                onPress={() => openEmail(primaryEmail!)}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: colors.surfacePressed },
                  ]}
                >
                  <IconMail size={20} stroke={colors.iconPrimary} />
                </View>
              </ScalePressable>
            ) : null}
          </View>
        ) : null}

        <ContactPhonesSection phones={phones} onSavePhones={handleSavePhones} />
        <ContactEmailsSection emails={emails} onSaveEmails={handleSaveEmails} />

        <ContactSocialSection
          contact={contact}
          contactFirstName={contact.firstName}
          onUpdateSocial={handleUpdateSocial}
        />

        <ContactTagsSection
          contactId={contact.id}
          contactName={formatContactName(contact)}
          tags={memberTags}
          loading={tagsLoading}
          error={tagsError}
          onRetry={() => void loadContactTags(contact.id)}
          onTagAdded={(tag) =>
            setMemberTags((prev) =>
              prev.some((existing) => existing.id === tag.id)
                ? prev
                : [...prev, { ...tag, contactCount: 0 }],
            )
          }
          onTagsReplaced={(tags) => setMemberTags(tags as TagWithCount[])}
        />

        {!isMyselfMode ? (
          <ContactGroupsSection
            contactId={contact.id}
            contactName={formatContactName(contact)}
            groups={memberGroups}
            loading={groupsLoading}
            error={groupsError}
            onRetry={() => void loadContactGroups(contact.id)}
            onGroupAdded={(group) =>
              setMemberGroups((prev) =>
                prev.some((existing) => existing.id === group.id)
                  ? prev
                  : [...prev, { ...group, contactCount: 0 }],
              )
            }
            onGroupsReplaced={(groups) => setMemberGroups(groups as GroupWithCount[])}
          />
        ) : null}

        <ContactAddressesSection
          addresses={addresses}
          onSaveAddresses={handleSaveAddresses}
        />

        <ContactImportantDatesSection
          dates={importantDates}
          contactFirstName={contact.firstName}
          onSaveDates={handleSaveImportantDates}
        />

        <View style={contactDetailStyles.section}>
          <ContactDetailSectionHeader title="Notes" />
          <Pressable
            style={[
              contactDetailStyles.card,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
            onPress={openNotesEditor}
            accessibilityRole="button"
            accessibilityLabel={notesMarkdown ? "Edit notes" : "Add notes"}
          >
            {notesMarkdown ? (
              <>
                <View style={notesExpanded ? undefined : styles.notesCollapsed}>
                  <EnrichedMarkdownText
                    markdown={notesMarkdown}
                    flavor="github"
                    onLinkPress={handleMentionLinkPress}
                    markdownStyle={{
                      paragraph: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 4 },
                      h1: { color: colors.textPrimary },
                      h2: { color: colors.textPrimary },
                      h3: { color: colors.textPrimary },
                      list: { color: colors.textSecondary, fontSize: 15 },
                      link: { color: colors.primary },
                      code: { backgroundColor: colors.surfacePressed },
                      blockquote: { borderColor: colors.border },
                      linkVariants: {
                        "^bp://person/": {
                          color: colors.primary,
                          backgroundColor: colors.primary + "18",
                          underline: false,
                        },
                      },
                    }}
                  />
                </View>
                {longNotes ? (
                  <Pressable
                    style={styles.showMoreButton}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setNotesExpanded((v) => !v);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={notesExpanded ? "Show less notes" : "Show more notes"}
                  >
                    {notesExpanded ? (
                      <IconChevronUp size={14} stroke={colors.iconSecondary} />
                    ) : (
                      <IconChevronDown size={14} stroke={colors.iconSecondary} />
                    )}
                    <Text style={[styles.showMoreText, { color: colors.textMuted }]}>
                      {notesExpanded ? "Show less" : "Show more"}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Text style={[styles.notesPlaceholder, { color: colors.textMuted }]}>
                Add notes…
              </Text>
            )}
          </Pressable>
        </View>

        {hasInfo ? (
          <View style={contactDetailStyles.section}>
            <ContactDetailSectionHeader title="Info" />

            {contact.lastInteraction ? (
              <View
                style={[
                  contactDetailStyles.card,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={contactDetailStyles.infoRow}>
                  <IconClock size={16} stroke={colors.iconSecondary} />
                  <View style={contactDetailStyles.infoTexts}>
                    <Text
                      style={[
                        contactDetailStyles.sectionLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      Last interaction
                    </Text>
                    <Text
                      style={[
                        contactDetailStyles.infoValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {formatRelativeDate(contact.lastInteraction)} ·{" "}
                      {formatAbsoluteDate(contact.lastInteraction)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  heroSection: {
    marginBottom: 4,
  },
  heroHeaderSpacer: {
    flex: 1,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 6,
  },
  avatarCircle: {
    width: MOBILE_LAYOUT.avatar.hero,
    height: MOBILE_LAYOUT.avatar.hero,
    borderRadius: MOBILE_LAYOUT.avatar.heroRadius,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  avatarImage: {
    width: MOBILE_LAYOUT.avatar.hero,
    height: MOBILE_LAYOUT.avatar.hero,
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 1,
  },
  heroName: {
    fontSize: 24,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    textAlign: "center",
  },
  heroHeadline: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    textAlign: "center",
  },
  heroPlace: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    textAlign: "center",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: "center",
    gap: 6,
  },
  actionIcon: {
    width: MOBILE_LAYOUT.touchTargetLarge,
    height: MOBILE_LAYOUT.touchTargetLarge,
    borderRadius: MOBILE_LAYOUT.touchTargetLarge / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  notesCollapsed: {
    maxHeight: 88,
    overflow: "hidden",
  },
  notesPlaceholder: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    lineHeight: 20,
    fontStyle: "italic",
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  infoNote: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    marginTop: 2,
  },
});
