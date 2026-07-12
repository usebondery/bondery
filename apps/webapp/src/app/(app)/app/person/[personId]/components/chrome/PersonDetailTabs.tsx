"use client";

import type {
  Contact,
  ContactPreview,
  ContactRelationshipWithPeople,
  ContactSelectable,
  GroupWithCount,
  ImportantDate,
  LinkedInDataResponse,
  RelationshipType,
} from "@bondery/schemas";
import type { TranslateFn } from "@bondery/translations";
import { Button, Group, Stack, Tabs, Text } from "@mantine/core";
import {
  IconBrandLinkedin,
  IconCalendarEvent,
  IconPlus,
  IconTags,
  IconUserCircle,
} from "@tabler/icons-react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { KeepInTouchSelect } from "@/app/(app)/app/keep-in-touch/components/KeepInTouchSelect";
import { computeNextDueDate } from "@/app/(app)/app/keep-in-touch/utils/keepInTouchConfig";
import { DatePickerWithPresets } from "@/components/interactions/DatePickerWithPresets";
import { datePickerValueToIsoDateTime } from "@/lib/dates/toIsoDateTime";
import { GroupCard } from "../../../../groups/components/GroupCard";
import { openNewActivityModal } from "../../../../interactions/components/NewActivityModal";
import type { ContactAddressSavePayload } from "../../utils/contactAddressUtils";
import type { PersonTabValue } from "../../utils/personTabConstants";
import { ContactAddressSection } from "../info/ContactAddressSection";
import { ContactImportantDatesSection } from "../info/ContactImportantDatesSection";
import { ContactPreferenceSection } from "../info/ContactPreferenceSection";
import { ContactRelationshipsSection } from "../info/ContactRelationshipsSection";
import { PersonInteractionsSection } from "../interactions/PersonInteractionsSection";
import { LinkedInTab } from "../linkedin/LinkedInTab";
import { PersonTagsInput } from "./PersonTagsInput";

interface PersonDetailTabsProps {
  activeTab: PersonTabValue;
  contact: Contact;
  currentPersonPreview: ContactPreview;
  enrichLabel: string;
  getInteractionTypeLabel: (type: string) => string;
  handleContactFieldBlur: (field: string, value: string) => void;
  handleSaveAddress: (payload: ContactAddressSavePayload) => Promise<void>;
  handleSaveImportantDates: (datesOverride?: ImportantDate[]) => Promise<void>;
  handleSaveKeepFrequency: (value: string | null) => Promise<void>;
  handleSaveLastInteraction: (date: string | null) => Promise<void>;
  importantDates: ImportantDate[];
  lastInteractionSource: { type: "activity"; activityType: string } | { type: "manual" } | null;
  linkedInData: LinkedInDataResponse;
  onAddRelationship: (relationshipType: RelationshipType, relatedPersonId: string) => Promise<void>;
  onDeleteRelationship: (relationshipId: string) => Promise<void>;
  onEnrich: () => void;
  onImportantDatesChange: (dates: ImportantDate[]) => void;
  onTabChange: (value: string | null) => void;
  onUpdateRelationship: (
    relationshipId: string,
    relationshipType: RelationshipType,
    relatedPersonId: string,
  ) => Promise<void>;
  openAddToGroupsModal: () => void;
  personGroups: GroupWithCount[];
  personId: string;
  relationships: ContactRelationshipWithPeople[];
  relationshipsSaving: boolean;
  router: AppRouterInstance;
  savingField: string | null;
  savingLastInteraction: boolean;
  selectableContacts: ContactSelectable[];
  selectablePeople: ContactPreview[];
  tEditGroupsTitle: string;
  tInteractions: TranslateFn<"InteractionsPage">;
  tTabs: TranslateFn<"PersonTabs">;
}

export function PersonDetailTabs({
  activeTab,
  contact,
  currentPersonPreview,
  enrichLabel,
  getInteractionTypeLabel,
  handleContactFieldBlur,
  handleSaveAddress,
  handleSaveImportantDates,
  handleSaveKeepFrequency,
  handleSaveLastInteraction,
  importantDates,
  lastInteractionSource,
  linkedInData,
  onAddRelationship,
  onDeleteRelationship,
  onEnrich,
  onImportantDatesChange,
  onTabChange,
  openAddToGroupsModal,
  personGroups,
  personId,
  relationships,
  relationshipsSaving,
  router,
  savingField,
  savingLastInteraction,
  selectableContacts,
  selectablePeople,
  tEditGroupsTitle,
  tInteractions,
  tTabs,
  onUpdateRelationship,
}: PersonDetailTabsProps) {
  return (
    <Tabs keepMounted={false} onChange={onTabChange} value={activeTab}>
      <Tabs.List>
        <Tabs.Tab leftSection={<IconCalendarEvent size={16} />} value="interactions">
          {tTabs("Interactions")}
        </Tabs.Tab>
        <Tabs.Tab leftSection={<IconUserCircle size={16} />} value="about">
          {tTabs("About")}
        </Tabs.Tab>
        <Tabs.Tab leftSection={<IconTags size={16} />} value="organize">
          {tTabs("Organize")}
        </Tabs.Tab>
        <Tabs.Tab leftSection={<IconBrandLinkedin size={16} />} value="linkedin">
          {tTabs("LinkedIn")}
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel pt="md" value="interactions">
        <Stack gap="lg">
          <Group align="flex-start" gap="md" grow>
            <Stack gap={4}>
              <DatePickerWithPresets
                disabled={savingLastInteraction}
                label={tInteractions("LastInteractionInput")}
                onChange={(val) => {
                  handleSaveLastInteraction(
                    datePickerValueToIsoDateTime(val as Date | string | null),
                  );
                }}
                value={contact.lastInteraction ?? null}
              />
              {lastInteractionSource ? (
                <Text c="dimmed" size="xs">
                  {lastInteractionSource.type === "activity"
                    ? tInteractions("LastInteractionViaActivity", {
                        type: getInteractionTypeLabel(lastInteractionSource.activityType),
                      })
                    : tInteractions("LastInteractionManual")}
                </Text>
              ) : null}
            </Stack>
            <KeepInTouchSelect
              nextDueDate={computeNextDueDate(contact.lastInteraction, contact.keepFrequencyDays)}
              onChange={(val) => handleSaveKeepFrequency(val === "none" ? null : val)}
              value={contact.keepFrequencyDays?.toString() ?? "none"}
            />
          </Group>
          <Stack gap="xs">
            <Text fw={600} size="sm">
              {tTabs("Interactions")}
            </Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                openNewActivityModal({
                  contacts: [contact, ...selectableContacts].filter(
                    (item, index, self) =>
                      self.findIndex((other) => other.id === item.id) === index,
                  ),
                  initialParticipantIds: [contact.id],
                });
              }}
              size="xs"
              style={{ alignSelf: "flex-start" }}
              variant="light"
            >
              {tInteractions("AddActivity")}
            </Button>
            <PersonInteractionsSection contact={contact} personId={personId} />
          </Stack>
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel pt="md" value="about">
        <Stack gap="lg">
          <ContactImportantDatesSection
            dates={importantDates}
            onDatesChange={onImportantDatesChange}
            onSave={handleSaveImportantDates}
            personFirstName={contact.firstName}
            savingField={savingField}
          />

          <ContactRelationshipsSection
            currentPerson={currentPersonPreview}
            isSubmitting={relationshipsSaving}
            onAddRelationship={onAddRelationship}
            onDeleteRelationship={onDeleteRelationship}
            onUpdateRelationship={onUpdateRelationship}
            relationships={relationships}
            selectablePeople={selectablePeople}
          />

          <ContactPreferenceSection
            contact={contact}
            handleBlur={handleContactFieldBlur}
            savingField={savingField}
          />

          <ContactAddressSection
            contact={contact}
            isSaving={savingField === "address"}
            onSave={handleSaveAddress}
          />
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel pt="md" value="organize">
        <Stack gap="lg">
          <PersonTagsInput personId={personId} />

          <Stack gap="xs">
            <Text fw={500} size="sm">
              {tTabs("Groups")}
            </Text>
            <Group align="flex-start" gap="sm" wrap="wrap">
              {personGroups.map((group) => (
                <GroupCard
                  group={{
                    ...(group as GroupWithCount),
                    contactCount: 1,
                    previewContacts: [currentPersonPreview],
                  }}
                  interactive={true}
                  key={group.id}
                  onAddPeople={() => {}}
                  onClick={(groupId) => router.push(`/app/group/${groupId}`)}
                  onDelete={() => {}}
                  onDuplicate={() => {}}
                  onEdit={() => {}}
                  shadow="none"
                  showMenu={false}
                  variant="small"
                />
              ))}

              <GroupCard
                actionLabel={tEditGroupsTitle}
                interactive
                onActionClick={openAddToGroupsModal}
                shadow="none"
                variant="action"
              />
            </Group>
          </Stack>
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel pt="md" value="linkedin">
        <LinkedInTab
          education={linkedInData.education}
          enrichLabel={enrichLabel}
          linkedinBio={linkedInData.linkedinBio}
          onEnrich={onEnrich}
          syncedAt={linkedInData.syncedAt}
          workHistory={linkedInData.workHistory}
        />
      </Tabs.Panel>
    </Tabs>
  );
}
