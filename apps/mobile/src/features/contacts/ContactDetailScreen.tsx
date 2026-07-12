import { expandPersonMentionsForEditor, htmlToMarkdown } from "@bondery/helpers/notes";
import type { Contact, GroupWithCount, ImportantDate, TagWithCount } from "@bondery/schemas";
import { IconTrash } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionSheetPopup } from "../../components/ActionSheetPopup";
import { StackNavBar } from "../../components/chrome";
import { LoadErrorCard, loadErrorStackInset } from "../../components/load-state";
import {
  useCommonTranslations,
  useMobileSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import { preloadMobileNamespaces } from "../../lib/i18n/preloadMobileNamespaces";
import {
  useContact,
  useContactGroups,
  useContactImportantDates,
  useContactTags,
  useMyselfContact,
} from "../../lib/sync/hooks/useSyncQuery";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ContactAddressesSection } from "./components/ContactAddressesSection";
import { ContactDetailHeroSection } from "./components/ContactDetailHeroSection";
import { ContactDetailInfoSection } from "./components/ContactDetailInfoSection";
import { ContactDetailNotesSection } from "./components/ContactDetailNotesSection";
import { ContactDetailOverflowMenu } from "./components/ContactDetailOverflowMenu";
import { ContactDetailQuickActions } from "./components/ContactDetailQuickActions";
import { ContactEmailsSection } from "./components/ContactEmailsSection";
import { ContactGroupsSection } from "./components/ContactGroupsSection";
import { ContactImportantDatesSection } from "./components/ContactImportantDatesSection";
import { ContactPhonesSection } from "./components/ContactPhonesSection";
import { ContactSocialSection } from "./components/ContactSocialSection";
import { ContactTagsSection } from "./components/ContactTagsSection";
import { contactDetailScreenStyles as styles } from "./components/contactDetailScreenStyles";
import { EditIdentitySheet } from "./components/EditIdentitySheet";
import {
  formatContactName,
  getContactAddresses,
  parseContactEmails,
  parseContactPhones,
} from "./contactUtils";
import { useContactDetailHandlers } from "./hooks/useContactDetailHandlers";
import { useMentionableContacts } from "./hooks/useMentionableContacts";
import { ShareContactEmailSheet } from "./ShareContactEmailSheet";

interface ContactDetailScreenProps {
  id?: string;
  isMyselfMode?: boolean;
}

interface ContactDetailScreenLoadedProps {
  contact: Contact;
  groupsLoading: boolean;
  importantDates: ImportantDate[];
  isMyselfMode: boolean;
  memberGroups: GroupWithCount[];
  memberTags: TagWithCount[];
  mentionableContactIds: Set<string>;
  myselfContactId: string | null | undefined;
  notesMarkdown: string;
  onReload: () => void;
  refreshGroups: () => void;
  refreshTags: () => void;
  tagsLoading: boolean;
}

function ContactDetailScreenLoaded({
  contact,
  groupsLoading,
  importantDates,
  isMyselfMode,
  memberGroups,
  memberTags,
  mentionableContactIds,
  myselfContactId,
  notesMarkdown,
  onReload,
  refreshGroups,
  refreshTags,
  tagsLoading,
}: ContactDetailScreenLoadedProps) {
  const t = useCommonTranslations();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useMobileThemeColors();
  const handlers = useContactDetailHandlers({
    contact,
    isMyselfMode,
    onContactUpdated: onReload,
  });

  const phones = parseContactPhones(contact);
  const emails = parseContactEmails(contact);
  const addresses = getContactAddresses(contact);

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <StackNavBar
        onBack={() => router.back()}
        right={
          <ContactDetailOverflowMenu
            isBusy={handlers.isDeleting || handlers.isSharing}
            isMyselfMode={isMyselfMode}
            onDelete={() => handlers.setDeleteConfirmOpen(true)}
            onShare={handlers.shareContact}
            onShareViaEmail={() => handlers.setShareEmailSheetOpen(true)}
          />
        }
      />

      <ActionSheetPopup
        actions={[
          {
            disabled: handlers.isDeleting,
            label: t("actions.cancel"),
            onPress: () => handlers.setDeleteConfirmOpen(false),
            tone: "neutral",
            variant: "outline",
          },
          {
            disabled: handlers.isDeleting,
            icon: <IconTrash color={colors.textOnPrimary} size={16} />,
            label: t("actions.delete"),
            loading: handlers.isDeleting,
            onPress: handlers.handleDeleteContact,
            tone: "danger",
            variant: "filled",
          },
        ]}
        isBusy={handlers.isDeleting}
        onClose={() => handlers.setDeleteConfirmOpen(false)}
        onOpenChange={handlers.setDeleteConfirmOpen}
        open={handlers.isDeleteConfirmOpen}
      />

      <ShareContactEmailSheet
        contactId={contact.id}
        contactName={handlers.name}
        onClose={() => handlers.setShareEmailSheetOpen(false)}
        onOpenChange={handlers.setShareEmailSheetOpen}
        open={handlers.isShareEmailSheetOpen}
      />

      <EditIdentitySheet
        contact={contact}
        isMyselfMode={isMyselfMode}
        onClose={() => handlers.setIdentitySheetOpen(false)}
        onContactUpdated={onReload}
        onOpenChange={handlers.setIdentitySheetOpen}
        open={handlers.isIdentitySheetOpen}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <ContactDetailHeroSection
          colors={colors}
          contact={contact}
          onEditPress={() => handlers.setIdentitySheetOpen(true)}
        />

        <ContactDetailQuickActions
          colors={colors}
          emails={emails}
          onOpenEmail={handlers.openEmail}
          onOpenPhone={handlers.openPhone}
          onOpenSms={handlers.openSms}
          phones={phones}
        />

        <ContactPhonesSection onSavePhones={handlers.handleSavePhones} phones={phones} />
        <ContactEmailsSection emails={emails} onSaveEmails={handlers.handleSaveEmails} />

        <ContactSocialSection
          contact={contact}
          contactFirstName={contact.firstName}
          onUpdateSocial={handlers.handleUpdateSocial}
        />

        <ContactTagsSection
          contactId={contact.id}
          contactName={formatContactName(contact)}
          error={null}
          loading={tagsLoading}
          onRetry={refreshTags}
          onTagAdded={() => refreshTags()}
          onTagsReplaced={() => refreshTags()}
          tags={memberTags}
        />

        {!isMyselfMode ? (
          <ContactGroupsSection
            contactId={contact.id}
            contactName={formatContactName(contact)}
            error={null}
            groups={memberGroups}
            loading={groupsLoading}
            onGroupAdded={() => refreshGroups()}
            onGroupsReplaced={() => refreshGroups()}
            onRetry={refreshGroups}
          />
        ) : null}

        <ContactAddressesSection
          addresses={addresses}
          onSaveAddresses={handlers.handleSaveAddresses}
        />

        <ContactImportantDatesSection
          contactFirstName={contact.firstName}
          dates={importantDates}
          onSaveDates={handlers.handleSaveImportantDates}
        />

        <ContactDetailNotesSection
          colors={colors}
          mentionableContactIds={mentionableContactIds}
          myselfContactId={myselfContactId}
          notesMarkdown={notesMarkdown}
          onOpenNotesEditor={handlers.openNotesEditor}
        />

        <ContactDetailInfoSection colors={colors} contact={contact} />

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

export function ContactDetailScreen({ id, isMyselfMode = false }: ContactDetailScreenProps) {
  const t = useCommonTranslations();
  const tMobileSettings = useMobileSettingsTranslations();
  const router = useRouter();
  const colors = useMobileThemeColors();
  useEffect(() => {
    void preloadMobileNamespaces(["mobile.contactDetail"]);
  }, []);
  const {
    data: syncedContact,
    isInitialSync: isContactInitialSync,
    refresh: refreshContact,
  } = useContact(isMyselfMode ? undefined : id);
  const {
    data: myself,
    isInitialSync: isMyselfInitialSync,
    refresh: refreshMyself,
  } = useMyselfContact();
  const contact = isMyselfMode ? myself : syncedContact;
  const contactId = contact?.id;
  const { data: importantDates, refresh: refreshImportantDates } =
    useContactImportantDates(contactId);
  const {
    data: memberTags,
    refresh: refreshTags,
    isInitialSync: isTagsInitialSync,
  } = useContactTags(contactId);
  const {
    data: memberGroups,
    refresh: refreshGroups,
    isInitialSync: isGroupsInitialSync,
  } = useContactGroups(isMyselfMode ? undefined : contactId);
  const [error, setError] = useState<string | null>(null);
  const loading = isMyselfMode ? isMyselfInitialSync && !contact : isContactInitialSync && !contact;
  const tagsLoading = isTagsInitialSync && contactId != null;
  const groupsLoading = !isMyselfMode && isGroupsInitialSync && contactId != null;

  const {
    contacts: mentionableContacts,
    myselfContactId,
    getContactName,
  } = useMentionableContacts({
    contactId: contact?.id ?? id ?? null,
    isMyselfMode,
  });

  const mentionableContactIds = useMemo(
    () => new Set(mentionableContacts.map((item) => item.id)),
    [mentionableContacts],
  );

  useEffect(() => {
    if (!isMyselfMode && !id) {
      setError("Contact not found");
      return;
    }
    setError(null);
  }, [id, isMyselfMode]);

  const reloadContact = useCallback(() => {
    if (isMyselfMode) {
      refreshMyself();
    } else {
      refreshContact();
    }
    refreshImportantDates();
    refreshTags();
    if (!isMyselfMode) {
      refreshGroups();
    }
  }, [
    isMyselfMode,
    refreshContact,
    refreshGroups,
    refreshImportantDates,
    refreshMyself,
    refreshTags,
  ]);

  const notesMarkdown = useMemo(() => {
    const raw = htmlToMarkdown(contact?.notes ?? "");
    if (!contact) {
      return raw;
    }
    return expandPersonMentionsForEditor(raw, getContactName);
  }, [contact, getContactName]);

  if (loading || error || !contact) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
        <StackNavBar onBack={() => router.back()} />
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.textPrimary} size="large" />
          </View>
        ) : (
          <View style={loadErrorStackInset}>
            <LoadErrorCard
              description={error ?? t("errors.unknown")}
              onRetry={reloadContact}
              title={tMobileSettings("LoadErrorTitle")}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <ContactDetailScreenLoaded
      contact={contact}
      groupsLoading={groupsLoading}
      importantDates={importantDates}
      isMyselfMode={isMyselfMode}
      memberGroups={memberGroups}
      memberTags={memberTags}
      mentionableContactIds={mentionableContactIds}
      myselfContactId={myselfContactId}
      notesMarkdown={notesMarkdown}
      onReload={reloadContact}
      refreshGroups={refreshGroups}
      refreshTags={refreshTags}
      tagsLoading={tagsLoading}
    />
  );
}
