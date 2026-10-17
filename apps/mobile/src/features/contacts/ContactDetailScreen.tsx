import type { Contact, GroupWithCount, TagWithCount } from "@bondery/schemas";
import { IconTrash } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavBar } from "../../components/chrome";
import { LoadErrorCard, loadErrorStackInset } from "../../components/load-state";
import { Sheet } from "../../components/ui/Sheet";
import {
  useCommonTranslations,
  useMobileContactDetailTranslations,
  useMobileSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import { goBackOrReplace } from "../../lib/navigation/goBackOrReplace";
import {
  useContact,
  useContactGroups,
  useContactTags,
  useMyselfContact,
  useMyselfContactId,
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
import { useDeferredContactNotes } from "./hooks/useDeferredContactNotes";
import { ShareContactEmailSheet } from "./ShareContactEmailSheet";

interface ContactDetailScreenProps {
  id?: string;
  isMyselfMode?: boolean;
}

interface ContactDetailScreenLoadedProps {
  contact: Contact;
  groupsLoading: boolean;
  isMyselfMode: boolean;
  memberGroups: GroupWithCount[];
  memberTags: TagWithCount[];
  myselfContactId: string | null | undefined;
  onReload: () => void;
  refreshGroups: () => void;
  refreshTags: () => void;
  tagsLoading: boolean;
}

function ContactDetailScreenLoaded({
  contact,
  groupsLoading,
  isMyselfMode,
  memberGroups,
  memberTags,
  myselfContactId,
  onReload,
  refreshGroups,
  refreshTags,
  tagsLoading,
}: ContactDetailScreenLoadedProps) {
  const t = useCommonTranslations();
  const tMobileContactDetail = useMobileContactDetailTranslations();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useMobileThemeColors();
  const handlers = useContactDetailHandlers({
    contact,
    isMyselfMode,
    onContactUpdated: onReload,
  });
  const notes = useDeferredContactNotes(contact.notes);

  const phones = parseContactPhones(contact);
  const emails = parseContactEmails(contact);
  const addresses = getContactAddresses(contact);

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <StackNavBar
        onBack={() => goBackOrReplace(router, "/contacts")}
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

      {handlers.isDeleteConfirmOpen ? (
        <Sheet
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
              loadingText: t("feedback.deleting"),
              onPress: handlers.submitDelete,
              tone: "danger",
              variant: "filled",
            },
          ]}
          isBusy={handlers.isDeleting}
          onClose={() => {
            if (handlers.isDeleting) {
              return;
            }
            handlers.setDeleteConfirmOpen(false);
          }}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && handlers.isDeleting) {
              return;
            }
            handlers.setDeleteConfirmOpen(nextOpen);
          }}
          opened={handlers.isDeleteConfirmOpen}
          title={tMobileContactDetail("DeleteContactConfirmTitle").replace("{name}", handlers.name)}
        />
      ) : null}

      {handlers.isShareEmailSheetOpen ? (
        <ShareContactEmailSheet
          contactId={contact.id}
          contactName={handlers.name}
          onClose={() => handlers.setShareEmailSheetOpen(false)}
          onOpenChange={handlers.setShareEmailSheetOpen}
          open={handlers.isShareEmailSheetOpen}
        />
      ) : null}

      {handlers.isIdentitySheetOpen ? (
        <EditIdentitySheet
          contact={contact}
          isMyselfMode={isMyselfMode}
          onClose={() => handlers.setIdentitySheetOpen(false)}
          onContactUpdated={onReload}
          onOpenChange={handlers.setIdentitySheetOpen}
          open={handlers.isIdentitySheetOpen}
        />
      ) : null}

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
          dates={contact.importantDates ?? []}
          onSaveDates={handlers.handleSaveImportantDates}
        />

        <ContactDetailNotesSection
          colors={colors}
          mentionableContactIds={notes.mentionableContactIds}
          myselfContactId={myselfContactId}
          notesMarkdown={notes.notesMarkdown}
          notesPending={notes.isPending}
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
  const {
    data: syncedContact,
    isInitialSync: isContactInitialSync,
    refresh: refreshContact,
  } = useContact(isMyselfMode ? undefined : id);
  const {
    data: myself,
    isInitialSync: isMyselfInitialSync,
    refresh: refreshMyself,
  } = useMyselfContact(isMyselfMode);
  const { data: myselfContactIdFromDb } = useMyselfContactId(!isMyselfMode);
  const contact = isMyselfMode ? myself : syncedContact;
  const tagsPersonId = isMyselfMode ? contact?.id : id;
  const {
    data: memberTags,
    refresh: refreshTags,
    isInitialSync: isTagsInitialSync,
  } = useContactTags(tagsPersonId);
  const {
    data: memberGroups,
    refresh: refreshGroups,
    isInitialSync: isGroupsInitialSync,
  } = useContactGroups(isMyselfMode ? undefined : id);
  const loading = isMyselfMode ? isMyselfInitialSync && !contact : isContactInitialSync && !contact;
  const tagsLoading = isTagsInitialSync && tagsPersonId != null;
  const groupsLoading = !isMyselfMode && isGroupsInitialSync && id != null;
  const myselfContactId = isMyselfMode ? contact?.id : myselfContactIdFromDb;

  const reloadContact = useCallback(() => {
    if (isMyselfMode) {
      refreshMyself();
    } else {
      refreshContact();
    }
    refreshTags();
    if (!isMyselfMode) {
      refreshGroups();
    }
  }, [isMyselfMode, refreshContact, refreshGroups, refreshMyself, refreshTags]);

  if (loading || !contact) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
        <StackNavBar onBack={() => goBackOrReplace(router, "/contacts")} />
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.textPrimary} size="large" />
          </View>
        ) : (
          <View style={loadErrorStackInset}>
            <LoadErrorCard
              description={t("errors.api.contact_not_found")}
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
      isMyselfMode={isMyselfMode}
      memberGroups={memberGroups}
      memberTags={memberTags}
      myselfContactId={myselfContactId}
      onReload={reloadContact}
      refreshGroups={refreshGroups}
      refreshTags={refreshTags}
      tagsLoading={tagsLoading}
    />
  );
}
