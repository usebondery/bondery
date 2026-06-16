import { Group, Stack } from "@mantine/core";
import { IconBriefcase } from "@tabler/icons-react";
import type { Contact, EmailEntry, PhoneEntry } from "@bondery/types";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { notifications } from "@mantine/notifications";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { ContactPhotoUploadButton } from "./ContactPhotoUploadButton";
import { InlineEditableInput } from "./InlineEditableInput";
import { SocialsSection } from "./SocialsSection";
import { INPUT_MAX_LENGTHS } from "@/lib/config";
import { LocationLookupInput } from "@/app/(app)/app/components/LocationLookupInput";
import { revalidateSettings } from "@/app/(app)/app/actions";

type NameField = "firstName" | "middleName" | "lastName";
type ProfileField = "headline" | "location";

interface ContactIdentitySectionProps {
  contact: Contact;
  personId: string;
  phones: PhoneEntry[];
  emails: EmailEntry[];
  savingField: string | null;
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onEmailsChange: (emails: EmailEntry[]) => void;
  onSaveContactInfo: (payload?: { phones?: PhoneEntry[]; emails?: EmailEntry[] }) => void;
}

interface NameFieldsProps {
  personId: string;
  initialFirstName: string;
  initialMiddleName: string;
  initialLastName: string;
  isMyselfContact: boolean;
}

interface NameFieldConfig {
  field: NameField;
  placeholder: string;
  maxLength: number;
  required?: boolean;
  successLabel: string;
}

interface ProfileFieldConfig {
  field: ProfileField;
  placeholder: string;
  maxLength: number;
  successLabel: string;
}

const NAME_FIELD_CONFIGS: NameFieldConfig[] = [
  {
    field: "firstName",
    placeholder: "First name",
    maxLength: INPUT_MAX_LENGTHS.firstName,
    required: true,
    successLabel: "First",
  },
  {
    field: "middleName",
    placeholder: "Middle name",
    maxLength: INPUT_MAX_LENGTHS.middleName,
    successLabel: "Middle",
  },
  {
    field: "lastName",
    placeholder: "Last name",
    maxLength: INPUT_MAX_LENGTHS.lastName,
    successLabel: "Last",
  },
];

const PROFILE_FIELD_CONFIGS: ProfileFieldConfig[] = [
  {
    field: "headline",
    placeholder: "Headline",
    maxLength: INPUT_MAX_LENGTHS.headline,
    successLabel: "Headline",
  },
  {
    field: "location",
    placeholder: "Location",
    maxLength: INPUT_MAX_LENGTHS.location,
    successLabel: "Location",
  },
];

/**
 * Manages inline editable name fields with isolated per-field save lifecycle.
 * Typing is local-only and each field saves independently on blur.
 */
function usePersonNameFields(
  personId: string,
  initialValues: Record<NameField, string>,
  fieldConfigs: NameFieldConfig[],
  isMyselfContact: boolean,
) {
  const [focusedField, setFocusedField] = useState<NameField | null>(null);
  const [savingByField, setSavingByField] = useState<Record<NameField, boolean>>({
    firstName: false,
    middleName: false,
    lastName: false,
  });
  const [values, setValues] = useState<Record<NameField, string>>(initialValues);

  const persistedValuesRef = useRef<Record<NameField, string>>(initialValues);

  const updateField = useCallback((field: NameField, value: string) => {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  const saveField = useCallback(
    async (field: NameField) => {
      const config = fieldConfigs.find((item) => item.field === field);
      if (!config) return;

      const value = values[field];
      const persistedValue = persistedValuesRef.current[field];

      if (value === persistedValue) return;

      if (config.required && !value.trim()) {
        notifications.show(
          errorNotificationTemplate({
            title: "Validation Error",
            description: "First name is required",
          }),
        );
        return;
      }

      setSavingByField((previous) => ({
        ...previous,
        [field]: true,
      }));

      try {
        const response = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });

        if (!response.ok) {
          throw new Error("Failed to update");
        }

        persistedValuesRef.current[field] = value;

        if (isMyselfContact && field === "firstName") {
          await revalidateSettings();
        }

        notifications.show(
          successNotificationTemplate({
            title: "Saved",
            description: `${config.successLabel} name updated`,
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
        setSavingByField((previous) => ({
          ...previous,
          [field]: false,
        }));
      }
    },
    [fieldConfigs, personId, values],
  );

  const handleBlur = useCallback(
    (field: NameField) => {
      setFocusedField(null);
      void saveField(field);
    },
    [saveField],
  );

  return {
    values,
    focusedField,
    savingByField,
    setFocusedField,
    updateField,
    handleBlur,
  };
}

/**
 * Manages inline editable profile fields (headline/location) with isolated state.
 * Keeps focus and typing local to avoid global page rerenders.
 */
function usePersonProfileFields(
  personId: string,
  initialValues: Record<ProfileField, string>,
  fieldConfigs: ProfileFieldConfig[],
) {
  const [focusedField, setFocusedField] = useState<ProfileField | null>(null);
  const [savingByField, setSavingByField] = useState<Record<ProfileField, boolean>>({
    headline: false,
    location: false,
  });
  const [values, setValues] = useState<Record<ProfileField, string>>(initialValues);

  const persistedValuesRef = useRef<Record<ProfileField, string>>(initialValues);
  const placeCoordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    setValues(initialValues);
    persistedValuesRef.current = initialValues;
    placeCoordinatesRef.current = null;
  }, [initialValues.location, initialValues.headline, personId]);

  const updateField = useCallback((field: ProfileField, value: string) => {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (field === "location") {
      placeCoordinatesRef.current = null;
    }
  }, []);

  const savePlaceFromSuggestion = useCallback(
    async (value: string, latitude: number | null, longitude: number | null) => {
      setValues((previous) => ({
        ...previous,
        location: value,
      }));

      if (latitude === null || longitude === null) {
        placeCoordinatesRef.current = null;
        return;
      }

      placeCoordinatesRef.current = { latitude, longitude };

      setSavingByField((previous) => ({
        ...previous,
        location: true,
      }));

      try {
        const response = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: value,
            latitude,
            longitude,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update");
        }

        persistedValuesRef.current.location = value;

        notifications.show(
          successNotificationTemplate({
            title: "Saved",
            description: "Location updated",
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: "Error",
            description: "Failed to update location",
          }),
        );
      } finally {
        setSavingByField((previous) => ({
          ...previous,
          location: false,
        }));
      }
    },
    [personId],
  );

  const saveField = useCallback(
    async (field: ProfileField) => {
      const config = fieldConfigs.find((item) => item.field === field);
      if (!config) return;

      const value = values[field];
      const persistedValue = persistedValuesRef.current[field];

      if (value === persistedValue) return;

      setSavingByField((previous) => ({
        ...previous,
        [field]: true,
      }));

      try {
        const locationCoordinates = field === "location" ? placeCoordinatesRef.current : null;
        const payload: Record<string, string | number | null> = {
          [field]: value,
        };

        if (field === "location" && locationCoordinates) {
          payload.latitude = locationCoordinates.latitude;
          payload.longitude = locationCoordinates.longitude;
        }

        const response = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Failed to update");
        }

        persistedValuesRef.current[field] = value;

        notifications.show(
          successNotificationTemplate({
            title: "Saved",
            description: `${config.successLabel} updated`,
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: "Error",
            description: `Failed to update ${field === "location" ? "location" : field}`,
          }),
        );
      } finally {
        setSavingByField((previous) => ({
          ...previous,
          [field]: false,
        }));
      }
    },
    [fieldConfigs, personId, values],
  );

  const handleBlur = useCallback(
    (field: ProfileField) => {
      setFocusedField(null);
      void saveField(field);
    },
    [saveField],
  );

  return {
    values,
    focusedField,
    savingByField,
    setFocusedField,
    updateField,
    savePlaceFromSuggestion,
    handleBlur,
  };
}

/**
 * Fully self-contained name fields that own their own local state and API
 * persistence. Parent is only notified lazily after a successful save so
 * the rest of the page tree never re-renders during typing or blur.
 *
 * Wrapped in React.memo with a personId-only comparator: any parent
 * re-render triggered by saving a name is completely ignored here, so
 * typing in one field while another is saving is never interrupted.
 */
const NameFields = React.memo(
  function NameFields({
    personId,
    initialFirstName,
    initialMiddleName,
    initialLastName,
    isMyselfContact,
  }: NameFieldsProps) {
    const { values, focusedField, savingByField, setFocusedField, updateField, handleBlur } =
      usePersonNameFields(
        personId,
        {
          firstName: initialFirstName,
          middleName: initialMiddleName,
          lastName: initialLastName,
        },
        NAME_FIELD_CONFIGS,
        isMyselfContact,
      );
    const [hoveredField, setHoveredField] = useState<NameField | null>(null);

    return (
      <Group grow gap={"xs"} wrap="nowrap">
        {NAME_FIELD_CONFIGS.map((config) => (
          <InlineEditableInput
            key={config.field}
            aria-label={config.placeholder}
            placeholder={
              focusedField === config.field || hoveredField === config.field
                ? config.placeholder
                : ""
            }
            value={values[config.field]}
            maxLength={config.maxLength}
            isSaving={savingByField[config.field]}
            isFocused={focusedField === config.field}
            showCounter
            size="lg"
            fw={"bold"}
            onMouseEnter={() => setHoveredField(config.field)}
            onMouseLeave={() => setHoveredField(null)}
            onFocus={() => setFocusedField(config.field)}
            onChange={(value) => updateField(config.field, value)}
            onBlur={() => handleBlur(config.field)}
          />
        ))}
      </Group>
    );
  },
  (prev, next) => prev.personId === next.personId && prev.isMyselfContact === next.isMyselfContact,
);

export function ContactIdentitySection({
  contact,
  personId,
  phones,
  emails,
  savingField,
  onPhonesChange,
  onEmailsChange,
  onSaveContactInfo,
}: ContactIdentitySectionProps) {
  const {
    values: profileValues,
    focusedField: focusedProfileField,
    savingByField: savingProfileByField,
    setFocusedField: setFocusedProfileField,
    updateField: updateProfileField,
    savePlaceFromSuggestion,
    handleBlur: handleProfileBlur,
  } = usePersonProfileFields(
    personId,
    {
      headline: contact.headline || "",
      location: contact.location || "",
    },
    PROFILE_FIELD_CONFIGS,
  );

  return (
    <Group align="center">
      <ContactPhotoUploadButton
        avatarUrl={contact.avatar || null}
        contactName={`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact"}
        contactId={personId}
        firstName={contact.firstName}
        lastName={contact.lastName}
        isMyselfContact={contact.myself === true}
      />

      <Stack gap="xs" style={{ flex: 1 }}>
        <Group gap="sm" align="flex-start">
          <Stack gap="xs" style={{ flex: 1 }}>
            <NameFields
              personId={personId}
              initialFirstName={contact.firstName || ""}
              initialMiddleName={contact.middleName || ""}
              initialLastName={contact.lastName || ""}
              isMyselfContact={contact.myself === true}
            />
          </Stack>
        </Group>

        <Group gap="xs" grow>
          <InlineEditableInput
            aria-label="Headline"
            placeholder="Headline"
            value={profileValues.headline}
            onChange={(value) => updateProfileField("headline", value)}
            onFocus={() => setFocusedProfileField("headline")}
            onBlur={() => handleProfileBlur("headline")}
            isSaving={savingProfileByField.headline}
            isFocused={focusedProfileField === "headline"}
            showCounter
            maxLength={INPUT_MAX_LENGTHS.headline}
            leftSection={<IconBriefcase size={18} />}
          />

          <div style={{ flex: 1 }}>
            <LocationLookupInput
              ariaLabel="Location"
              placeholder="Location"
              value={profileValues.location}
              disabled={savingProfileByField.location}
              mode="place"
              onChange={(value) => updateProfileField("location", value)}
              onSuggestionSelect={(selected) => {
                void savePlaceFromSuggestion(
                  selected.label,
                  selected.position.lat,
                  selected.position.lon,
                );
              }}
              onBlur={() => handleProfileBlur("location")}
            />
          </div>
        </Group>

        <SocialsSection
          contact={contact}
          personId={personId}
          phones={phones}
          emails={emails}
          savingField={savingField}
          onPhonesChange={onPhonesChange}
          onEmailsChange={onEmailsChange}
          onSaveContactInfo={onSaveContactInfo}
        />
      </Stack>
    </Group>
  );
}
