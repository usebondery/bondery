"use client";

import { geocodeSuggestionDisplayLabel } from "@bondery/helpers/geocode";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import {
  CONTACT_FIELD_MAX_LENGTHS,
  type Contact,
  type EmailEntry,
  firstZodErrorMessage,
  type PhoneEntry,
} from "@bondery/schemas";
import { Group, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBriefcase } from "@tabler/icons-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LocationLookupInput } from "@/components/shell/LocationLookupInput";
import {
  type NameField,
  type NameFieldConfig,
  type ProfileField,
  type ProfileFieldConfig,
  useContactIdentityFieldConfigs,
} from "@/lib/i18n/useContactIdentityFieldConfigs";
import { useUpdateContactMutation } from "@/lib/query/hooks/useContacts";
import { ContactPhotoUploadButton } from "../chrome/ContactPhotoUploadButton";
import { SocialsSection } from "../socials/SocialsSection";
import { InlineEditableInput } from "./InlineEditableInput";

interface ContactIdentitySectionProps {
  contact: Contact;
  emails: EmailEntry[];
  onEmailsChange: (emails: EmailEntry[]) => void;
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onSaveContactInfo: (payload?: { phones?: PhoneEntry[]; emails?: EmailEntry[] }) => void;
  personId: string;
  phones: PhoneEntry[];
  savingField: string | null;
}

interface NameFieldsProps {
  initialFirstName: string;
  initialLastName: string;
  initialMiddleName: string;
  isMyselfContact: boolean;
  personId: string;
}

/**
 * Manages inline editable name fields with isolated per-field save lifecycle.
 * Typing is local-only and each field saves independently on blur.
 */
function usePersonNameFields(
  personId: string,
  initialValues: Record<NameField, string>,
  fieldConfigs: NameFieldConfig[],
  isMyselfContact: boolean,
  nameFieldValidationSchemas: ReturnType<
    typeof useContactIdentityFieldConfigs
  >["nameFieldValidationSchemas"],
  copy: ReturnType<typeof useContactIdentityFieldConfigs>["copy"],
) {
  const updateContactMutation = useUpdateContactMutation(personId, {
    syncSettingsOnFirstNameChange: isMyselfContact,
  });
  const [focusedField, setFocusedField] = useState<NameField | null>(null);
  const [savingByField, setSavingByField] = useState<Record<NameField, boolean>>({
    firstName: false,
    lastName: false,
    middleName: false,
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
      if (!config) {
        return;
      }

      const value = values[field];
      const persistedValue = persistedValuesRef.current[field];

      if (value === persistedValue) {
        return;
      }

      const validation = nameFieldValidationSchemas[field].safeParse(value);
      if (!validation.success) {
        notifications.show(
          errorNotificationTemplate({
            description: firstZodErrorMessage(validation.error),
            title: copy.validationErrorTitle,
          }),
        );
        return;
      }

      setSavingByField((previous) => ({
        ...previous,
        [field]: true,
      }));

      try {
        await updateContactMutation.mutateAsync({ [field]: value });

        persistedValuesRef.current[field] = value;

        notifications.show(
          successNotificationTemplate({
            description: copy.nameFieldUpdated(config.successLabel),
            title: copy.savedTitle,
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description: copy.updateFieldFailed(field),
            title: copy.errorTitle,
          }),
        );
      } finally {
        setSavingByField((previous) => ({
          ...previous,
          [field]: false,
        }));
      }
    },
    [copy, fieldConfigs, nameFieldValidationSchemas, updateContactMutation, values],
  );

  const handleBlur = useCallback(
    (field: NameField) => {
      setFocusedField(null);
      void saveField(field);
    },
    [saveField],
  );

  return {
    focusedField,
    handleBlur,
    savingByField,
    setFocusedField,
    updateField,
    values,
  };
}

/**
 * Manages inline editable profile fields (headline/location) with isolated state.
 * Keeps focus and typing local to avoid global page rerenders.
 */
function usePersonProfileFields(
  personId: string,
  initialHeadline: string,
  initialLocation: string,
  fieldConfigs: ProfileFieldConfig[],
  profileFieldValidationSchemas: ReturnType<
    typeof useContactIdentityFieldConfigs
  >["profileFieldValidationSchemas"],
  copy: ReturnType<typeof useContactIdentityFieldConfigs>["copy"],
) {
  const updateContactMutation = useUpdateContactMutation(personId);
  const [focusedField, setFocusedField] = useState<ProfileField | null>(null);
  const [savingByField, setSavingByField] = useState<Record<ProfileField, boolean>>({
    headline: false,
    location: false,
  });
  const [values, setValues] = useState<Record<ProfileField, string>>({
    headline: initialHeadline,
    location: initialLocation,
  });

  const persistedValuesRef = useRef<Record<ProfileField, string>>({
    headline: initialHeadline,
    location: initialLocation,
  });
  const placeCoordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    setValues({
      headline: initialHeadline,
      location: initialLocation,
    });
    persistedValuesRef.current = {
      headline: initialHeadline,
      location: initialLocation,
    };
    placeCoordinatesRef.current = null;
  }, [initialHeadline, initialLocation]);

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
        await updateContactMutation.mutateAsync({
          latitude,
          location: value,
          longitude,
        });

        persistedValuesRef.current.location = value;

        notifications.show(
          successNotificationTemplate({
            description: copy.locationUpdated,
            title: copy.savedTitle,
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description: copy.updateFieldFailed("location"),
            title: copy.errorTitle,
          }),
        );
      } finally {
        setSavingByField((previous) => ({
          ...previous,
          location: false,
        }));
      }
    },
    [copy, updateContactMutation],
  );

  const saveField = useCallback(
    async (field: ProfileField) => {
      const config = fieldConfigs.find((item) => item.field === field);
      if (!config) {
        return;
      }

      const value = values[field];
      const persistedValue = persistedValuesRef.current[field];

      if (value === persistedValue) {
        return;
      }

      const validation = profileFieldValidationSchemas[field].safeParse(value);
      if (!validation.success) {
        notifications.show(
          errorNotificationTemplate({
            description: firstZodErrorMessage(validation.error),
            title: copy.validationErrorTitle,
          }),
        );
        return;
      }

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

        await updateContactMutation.mutateAsync(payload);

        persistedValuesRef.current[field] = value;

        notifications.show(
          successNotificationTemplate({
            description: copy.fieldUpdated(config.successLabel),
            title: copy.savedTitle,
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description: copy.updateFieldFailed(field),
            title: copy.errorTitle,
          }),
        );
      } finally {
        setSavingByField((previous) => ({
          ...previous,
          [field]: false,
        }));
      }
    },
    [copy, fieldConfigs, profileFieldValidationSchemas, updateContactMutation, values],
  );

  const handleBlur = useCallback(
    (field: ProfileField) => {
      setFocusedField(null);
      void saveField(field);
    },
    [saveField],
  );

  return {
    focusedField,
    handleBlur,
    savePlaceFromSuggestion,
    savingByField,
    setFocusedField,
    updateField,
    values,
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
    const { nameFieldConfigs, nameFieldValidationSchemas, copy } = useContactIdentityFieldConfigs();
    const { values, focusedField, savingByField, setFocusedField, updateField, handleBlur } =
      usePersonNameFields(
        personId,
        {
          firstName: initialFirstName,
          lastName: initialLastName,
          middleName: initialMiddleName,
        },
        nameFieldConfigs,
        isMyselfContact,
        nameFieldValidationSchemas,
        copy,
      );
    const [hoveredField, setHoveredField] = useState<NameField | null>(null);

    return (
      <Group gap={"xs"} grow wrap="nowrap">
        {nameFieldConfigs.map((config) => (
          <InlineEditableInput
            aria-label={config.placeholder}
            fw={"bold"}
            isFocused={focusedField === config.field}
            isSaving={savingByField[config.field]}
            key={config.field}
            maxLength={config.maxLength}
            onBlur={() => handleBlur(config.field)}
            onChange={(value) => updateField(config.field, value)}
            onFocus={() => setFocusedField(config.field)}
            onMouseEnter={() => setHoveredField(config.field)}
            onMouseLeave={() => setHoveredField(null)}
            placeholder={
              focusedField === config.field || hoveredField === config.field
                ? config.placeholder
                : ""
            }
            showCounter
            size="lg"
            value={values[config.field]}
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
  const { profileFieldConfigs, profileFieldValidationSchemas, copy } =
    useContactIdentityFieldConfigs();
  const headlineConfig = profileFieldConfigs.find((config) => config.field === "headline");
  const locationConfig = profileFieldConfigs.find((config) => config.field === "location");
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
    contact.headline || "",
    contact.location || "",
    profileFieldConfigs,
    profileFieldValidationSchemas,
    copy,
  );

  return (
    <Group align="center">
      <ContactPhotoUploadButton
        avatarUrl={contact.avatar || null}
        contactId={personId}
        contactName={
          `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || copy.contactNameFallback
        }
        firstName={contact.firstName}
        isMyselfContact={contact.myself === true}
        lastName={contact.lastName}
      />

      <Stack gap="xs" style={{ flex: 1 }}>
        <Group align="flex-start" gap="sm">
          <Stack gap="xs" style={{ flex: 1 }}>
            <NameFields
              initialFirstName={contact.firstName || ""}
              initialLastName={contact.lastName || ""}
              initialMiddleName={contact.middleName || ""}
              isMyselfContact={contact.myself === true}
              personId={personId}
            />
          </Stack>
        </Group>

        <Group gap="xs" grow>
          <InlineEditableInput
            aria-label={headlineConfig?.placeholder ?? ""}
            isFocused={focusedProfileField === "headline"}
            isSaving={savingProfileByField.headline}
            leftSection={<IconBriefcase size={18} />}
            maxLength={CONTACT_FIELD_MAX_LENGTHS.headline}
            onBlur={() => handleProfileBlur("headline")}
            onChange={(value) => updateProfileField("headline", value)}
            onFocus={() => setFocusedProfileField("headline")}
            placeholder={headlineConfig?.placeholder ?? ""}
            showCounter
            value={profileValues.headline}
          />

          <div style={{ flex: 1 }}>
            <LocationLookupInput
              ariaLabel={locationConfig?.placeholder ?? ""}
              disabled={savingProfileByField.location}
              mode="place"
              onBlur={() => handleProfileBlur("location")}
              onChange={(value) => updateProfileField("location", value)}
              onSuggestionSelect={(selected) => {
                void savePlaceFromSuggestion(
                  geocodeSuggestionDisplayLabel(selected),
                  selected.latitude,
                  selected.longitude,
                );
              }}
              placeholder={locationConfig?.placeholder ?? ""}
              value={profileValues.location}
            />
          </div>
        </Group>

        <SocialsSection
          contact={contact}
          emails={emails}
          onEmailsChange={onEmailsChange}
          onPhonesChange={onPhonesChange}
          onSaveContactInfo={onSaveContactInfo}
          personId={personId}
          phones={phones}
          savingField={savingField}
        />
      </Stack>
    </Group>
  );
}
