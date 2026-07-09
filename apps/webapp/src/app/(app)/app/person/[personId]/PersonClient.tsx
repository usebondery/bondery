"use client";

import { formatContactName } from "@bondery/helpers/contact";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { Center, Loader, Paper, Stack } from "@mantine/core";
import { IconUser, IconUserCircle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useBatchEnrichFromLinkedIn } from "@/components/extension/useBatchEnrichFromLinkedIn";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { usePatchDocumentTitle } from "@/lib/documentTitle";
import { useInteractionTypeLabel } from "@/lib/i18n/useInteractionTypeLabel";
import { useSlashCommands } from "@/lib/i18n/useSlashCommands";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import {
  useContactGroupsQuery,
  useContactImportantDatesQuery,
  useContactInteractionsQuery,
  useContactLinkedInDataQuery,
  useContactQuery,
  useContactRelationshipsQuery,
  useContactsListQuery,
  useCreateContactRelationshipMutation,
  useDeleteContactRelationshipMutation,
  usePutContactImportantDatesMutation,
  useUpdateContactMutation,
  useUpdateContactRelationshipMutation,
} from "@/lib/query/hooks/useContacts";
import { useContactMergeRecommendation } from "@/lib/query/hooks/useMergeRecommendations";
import { PERSON_SELECTABLE_CONTACTS } from "@/lib/query/personPageQueryParams";
import { ContactActionMenu } from "./components/chrome/ContactActionMenu";
import { PersonDetailTabs } from "./components/chrome/PersonDetailTabs";
import { ContactIdentitySection } from "./components/info/ContactIdentitySection";
import { RecommendationsSection } from "./components/linkedin/RecommendationsSection";
import { ContactNotesSection } from "./components/notes/ContactNotesSection";
import { createMentionSuggestion } from "./editor/mentionSuggestion";
import { createSlashCommandSuggestion } from "./editor/slashCommandSuggestion";
import { usePersonContactFormState } from "./hooks/usePersonContactFormState";
import { usePersonContactHandlers } from "./hooks/usePersonContactHandlers";
import { usePersonModalActions } from "./hooks/usePersonModalActions";
import { usePersonNotesEditor } from "./hooks/usePersonNotesEditor";
import { usePersonTabNavigation } from "./hooks/usePersonTabNavigation";

interface PersonClientProps {
  initialTab?: string;
  /** When true, renders the page as the "Myself" profile view: no back button, custom header, hides delete/merge actions. */
  myselfMode?: boolean;
  personId: string;
}

export function PersonClient({ personId, initialTab, myselfMode = false }: PersonClientProps) {
  const router = useRouter();
  const tCommon = useCommonTranslations();
  const tEnrich = useWebTranslations("EnrichFromLinkedIn");
  const tImportantDates = useWebTranslations("ContactImportantDates");
  const tPersonPage = useWebTranslations("SingleContactPage");
  const tVal = useWebTranslations("validation");
  const tAddress = useWebTranslations("ContactAddress");
  const tTabs = useWebTranslations("PersonTabs");
  const tInteractions = useWebTranslations("InteractionsPage");
  const tContactInfo = useWebTranslations("ContactInfo");
  const tEditGroups = useWebTranslations("AddPeopleToGroupSelectionModal");
  const tRelationships = useWebTranslations("PersonRelationships");
  const getInteractionTypeLabel = useInteractionTypeLabel();
  const slashCommands = useSlashCommands();
  const slashCommandSuggestion = useMemo(
    () => createSlashCommandSuggestion(slashCommands),
    [slashCommands],
  );
  const { startForPerson } = useBatchEnrichFromLinkedIn();

  const updateContactMutation = useUpdateContactMutation(personId);
  const createRelationshipMutation = useCreateContactRelationshipMutation(personId);
  const updateRelationshipMutation = useUpdateContactRelationshipMutation(personId);
  const deleteRelationshipMutation = useDeleteContactRelationshipMutation(personId);
  const putImportantDatesMutation = usePutContactImportantDatesMutation(personId);

  const { data: fetchedContact } = useContactQuery(personId);
  const { data: linkedInData } = useContactLinkedInDataQuery(personId);
  const { data: relationships = [] } = useContactRelationshipsQuery(personId);
  const { data: fetchedImportantDates } = useContactImportantDatesQuery(personId);
  const { data: personGroups = [] } = useContactGroupsQuery(personId);
  const { data: personActivities = [] } = useContactInteractionsQuery(personId);
  const { data: mergeRecommendation = null } = useContactMergeRecommendation(personId);
  const { data: selectableContactsData } = useContactsListQuery(PERSON_SELECTABLE_CONTACTS);

  const selectableContacts = useMemo(
    () => (selectableContactsData?.contacts ?? []).filter((candidate) => candidate.id !== personId),
    [selectableContactsData?.contacts, personId],
  );

  const { activeTab, handleTabChange } = usePersonTabNavigation(initialTab);

  const {
    contact,
    currentPersonPreview,
    emails,
    importantDates,
    lastInteractionSource,
    mentionableContacts,
    phones,
    resolvedContact,
    selectablePeople,
    setContact,
    setEditedValues,
    setEmails,
    setImportantDates,
    setPhones,
    signalPrefix,
    whatsappPrefix,
  } = usePersonContactFormState({
    fetchedContact,
    fetchedImportantDates,
    personActivities,
    personId,
    selectableContacts,
  });

  usePatchDocumentTitle(resolvedContact ? formatContactName(resolvedContact) : undefined);

  const mentionSuggestion = useMemo(
    () => createMentionSuggestion(mentionableContacts),
    [mentionableContacts],
  );

  const {
    handleAddRelationship,
    handleContactFieldBlur,
    handleDeleteRelationship,
    handleSaveAddress,
    handleSaveContactInfo,
    handleSaveImportantDates,
    handleSaveKeepFrequency,
    handleSaveLastInteraction,
    handleSocialSave,
    handleUpdateRelationship,
    relationshipsSaving,
    savingField,
    savingLastInteraction,
  } = usePersonContactHandlers({
    contact,
    createRelationshipMutation,
    deleteRelationshipMutation,
    emails,
    importantDates,
    personId,
    phones,
    putImportantDatesMutation,
    setContact,
    setEditedValues,
    signalPrefix,
    tAddress,
    tCommon,
    tContactInfo,
    tImportantDates,
    tInteractions,
    tPersonPage,
    tRelationships,
    tVal,
    updateContactMutation,
    updateRelationshipMutation,
    whatsappPrefix,
  });

  const { editor } = usePersonNotesEditor({
    contact,
    mentionSuggestion,
    onSaveNotes: handleSocialSave,
    slashCommandSuggestion,
    tPersonPage,
  });

  const {
    openAddToGroupsModal,
    openDeleteModal,
    openMergeWithModalForCurrentPerson,
    openShareModal,
  } = usePersonModalActions({
    contact,
    personId,
    resolvedContact,
    selectableContacts,
  });

  if (!contact || !linkedInData) {
    return (
      <PageWrapper>
        <Center py="xl">
          <Loader />
        </Center>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          action={
            <ContactActionMenu
              contact={contact}
              myselfMode={myselfMode}
              onDelete={openDeleteModal}
              onMergeWith={openMergeWithModalForCurrentPerson}
              onShare={openShareModal}
              personId={personId}
            />
          }
          backOnClick={
            myselfMode
              ? undefined
              : () => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    router.back();
                    return;
                  }
                  router.push(WEBAPP_ROUTES.PEOPLE);
                }
          }
          helpDoc={myselfMode ? "concepts.myself" : undefined}
          helpLabel={myselfMode ? tPersonPage("MyselfPageDescription") : undefined}
          icon={myselfMode ? IconUserCircle : IconUser}
          title={myselfMode ? tPersonPage("MyselfPageTitle") : tPersonPage("DetailsPageTitle")}
        />

        <RecommendationsSection
          linkedinHandle={contact.linkedin ?? null}
          mergeRecommendation={mergeRecommendation}
          personId={personId}
          showEnrichCard={!!contact.linkedin && !linkedInData.syncedAt}
        />

        <Paper p="xl" radius="md" shadow="sm" withBorder>
          <Stack gap="lg">
            <ContactIdentitySection
              contact={contact}
              emails={emails}
              onEmailsChange={setEmails}
              onPhonesChange={setPhones}
              onSaveContactInfo={handleSaveContactInfo}
              personId={personId}
              phones={phones}
              savingField={savingField}
            />

            <ContactNotesSection
              editor={editor}
              notesUpdatedAt={contact.notesUpdatedAt}
              savingField={savingField}
            />

            <PersonDetailTabs
              activeTab={activeTab}
              contact={contact}
              currentPersonPreview={currentPersonPreview}
              enrichLabel={tEnrich("MenuLabel")}
              getInteractionTypeLabel={getInteractionTypeLabel}
              handleContactFieldBlur={handleContactFieldBlur}
              handleSaveAddress={handleSaveAddress}
              handleSaveImportantDates={handleSaveImportantDates}
              handleSaveKeepFrequency={handleSaveKeepFrequency}
              handleSaveLastInteraction={handleSaveLastInteraction}
              importantDates={importantDates}
              lastInteractionSource={lastInteractionSource}
              linkedInData={linkedInData}
              onAddRelationship={handleAddRelationship}
              onDeleteRelationship={handleDeleteRelationship}
              onEnrich={() => startForPerson(personId, contact.linkedin)}
              onImportantDatesChange={setImportantDates}
              onTabChange={handleTabChange}
              onUpdateRelationship={handleUpdateRelationship}
              openAddToGroupsModal={openAddToGroupsModal}
              personGroups={personGroups}
              personId={personId}
              relationships={relationships}
              relationshipsSaving={relationshipsSaving}
              router={router}
              savingField={savingField}
              savingLastInteraction={savingLastInteraction}
              selectableContacts={selectableContacts}
              selectablePeople={selectablePeople}
              tEditGroupsTitle={tEditGroups("Title")}
              tInteractions={tInteractions}
              tTabs={tTabs}
            />
          </Stack>
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
