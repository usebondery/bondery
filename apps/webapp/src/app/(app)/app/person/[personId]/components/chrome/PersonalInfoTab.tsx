"use client";

import type {
  Contact,
  ContactPreview,
  ContactRelationshipWithPeople,
  ImportantDate,
  RelationshipType,
} from "@bondery/schemas";
import { Stack } from "@mantine/core";
import { ContactAddressSection } from "../info/ContactAddressSection";
import { ContactImportantDatesSection } from "../info/ContactImportantDatesSection";
import { ContactPreferenceSection } from "../info/ContactPreferenceSection";
import { ContactRelationshipsSection } from "../info/ContactRelationshipsSection";

interface PersonalInfoTabProps {
  contact: Contact;
  currentPerson: ContactPreview;
  handleBlur: (field: string, value: string) => void;
  importantDates: ImportantDate[];
  isRelationshipsSubmitting: boolean;
  onAddRelationship: (type: RelationshipType, relatedPersonId: string) => Promise<void>;
  onDatesChange: (events: ImportantDate[]) => void;
  onDeleteRelationship: (relationshipId: string) => Promise<void>;
  onSaveAddress: (payload: {
    addresses: Contact["addresses"];
    suggestedLocation: {
      location: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
  }) => Promise<void>;
  onSaveImportantDates: (events?: ImportantDate[]) => Promise<void>;
  onUpdateRelationship: (
    relationshipId: string,
    type: RelationshipType,
    relatedPersonId: string,
  ) => Promise<void>;
  relationships: ContactRelationshipWithPeople[];
  savingField: string | null;
  selectablePeople: ContactPreview[];
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
  importantDates,
  onDatesChange,
  onSaveImportantDates,
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
        dates={importantDates}
        onDatesChange={onDatesChange}
        onSave={onSaveImportantDates}
        personFirstName={contact.firstName}
        savingField={savingField}
      />

      <ContactPreferenceSection
        contact={contact}
        handleBlur={handleBlur}
        savingField={savingField}
      />

      <ContactAddressSection
        contact={contact}
        isSaving={savingField === "address"}
        onSave={onSaveAddress}
      />

      <ContactRelationshipsSection
        currentPerson={currentPerson}
        isSubmitting={isRelationshipsSubmitting}
        onAddRelationship={onAddRelationship}
        onDeleteRelationship={onDeleteRelationship}
        onUpdateRelationship={onUpdateRelationship}
        relationships={relationships}
        selectablePeople={selectablePeople}
      />
    </Stack>
  );
}
