"use client";

import { Stack } from "@mantine/core";
import type {
  Contact,
  ContactPreview,
  ContactRelationshipWithPeople,
  ImportantEvent,
  RelationshipType,
} from "@bondery/types";
import { ContactPreferenceSection } from "./ContactPreferenceSection";
import { ContactAddressSection } from "./ContactAddressSection";
import { ContactImportantDatesSection } from "./ContactImportantDatesSection";
import { ContactRelationshipsSection } from "./ContactRelationshipsSection";

interface PersonalInfoTabProps {
  contact: Contact;
  savingField: string | null;
  handleBlur: (field: string, value: string) => void;
  importantEvents: ImportantEvent[];
  onEventsChange: (events: ImportantEvent[]) => void;
  onSaveImportantEvents: (events?: ImportantEvent[]) => Promise<void>;
  onSaveAddress: (payload: {
    addresses: Contact["addresses"];
    suggestedLocation: {
      place: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
  }) => Promise<void>;
  currentPerson: ContactPreview;
  selectablePeople: ContactPreview[];
  relationships: ContactRelationshipWithPeople[];
  isRelationshipsSubmitting: boolean;
  onAddRelationship: (type: RelationshipType, relatedPersonId: string) => Promise<void>;
  onUpdateRelationship: (
    relationshipId: string,
    type: RelationshipType,
    relatedPersonId: string,
  ) => Promise<void>;
  onDeleteRelationship: (relationshipId: string) => Promise<void>;
}

/**
 * Tab content for the Personal Info section.
 * Groups together timezone/language preferences, addresses,
 * important dates, and relationships.
 *
 * @param props All required props for the child sections.
 */
export function PersonalInfoTab({
  contact,
  savingField,
  handleBlur,
  importantEvents,
  onEventsChange,
  onSaveImportantEvents,
  onSaveAddress,
  currentPerson,
  selectablePeople,
  relationships,
  isRelationshipsSubmitting,
  onAddRelationship,
  onUpdateRelationship,
  onDeleteRelationship,
}: PersonalInfoTabProps) {
  return (
    <Stack gap="lg">
      <ContactImportantDatesSection
        events={importantEvents}
        personFirstName={contact.firstName}
        savingField={savingField}
        onEventsChange={onEventsChange}
        onSave={onSaveImportantEvents}
      />

      <ContactPreferenceSection
        contact={contact}
        savingField={savingField}
        handleBlur={handleBlur}
      />

      <ContactAddressSection
        contact={contact}
        isSaving={savingField === "address"}
        onSave={onSaveAddress}
      />

      <ContactRelationshipsSection
        currentPerson={currentPerson}
        selectablePeople={selectablePeople}
        relationships={relationships}
        isSubmitting={isRelationshipsSubmitting}
        onAddRelationship={onAddRelationship}
        onUpdateRelationship={onUpdateRelationship}
        onDeleteRelationship={onDeleteRelationship}
      />
    </Stack>
  );
}
