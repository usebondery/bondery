"use client";

import { Group, Stack } from "@mantine/core";
import { IconBriefcase } from "@tabler/icons-react";
import {
  CONTACT_FIELD_MAX_LENGTHS,
  firstZodErrorMessage,
  type Contact,
  type EmailEntry,
  type PhoneEntry,
} from "@bondery/schemas";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { notifications } from "@mantine/notifications";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateContactMutation } from "@/lib/query/hooks/useContacts";
import { invalidateSettings } from "@/lib/query/invalidation";
import { ContactPhotoUploadButton } from "./ContactPhotoUploadButton";
import { InlineEditableInput } from "./InlineEditableInput";
import { SocialsSection } from "./SocialsSection";
import { LocationLookupInput } from "@/app/(app)/app/components/LocationLookupInput";
import { geocodeSuggestionDisplayLabel } from "@bondery/helpers/geocode";
import {
  useContactIdentityFieldConfigs,
  type NameField,
  type NameFieldConfig,
  type ProfileField,
  type ProfileFieldConfig,
} from "@/lib/i18n/useContactIdentityFieldConfigs";

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
  const queryClient = useQueryClient();
  const updateContactMutation = useUpdateContactMutation(personId);
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

      const validation = nameFieldValidationSchemas[field].safeParse(value);
      if (!validation.success) {
        notifications.show(
          errorNotificationTemplate({
            title: copy.validationErrorTitle,
            description: firstZodErrorMessage(validation.error),
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

        if (isMyselfContact && field === "firstName") {
          await invalidateSettings(queryClient);
        }

        notifications.show(
          successNotificationTemplate({
            title: copy.savedTitle,
            description: copy.nameFieldUpdated(config.successLabel),
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: copy.errorTitle,
            description: copy.updateFieldFailed(field),
          }),
        );
      } finally {
        setSavingByField((previous) => ({
          ...previous,
          [field]: false,
        }));
      }
    },
    [
      copy,
      fieldConfigs,
      isMyselfContact,
      nameFieldValidationSchemas,
      queryClient,
      updateContactMutation,
      values,
    ],
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
        await updateContactMutation.mutateAsync({
          location: value,
          latitude,
          longitude,
        });

        persistedValuesRef.current.location = value;

        notifications.show(
          successNotificationTemplate({
            title: copy.savedTitle,
            description: copy.locationUpdated,
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: copy.errorTitle,
            description: copy.updateFieldFailed("location"),
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
      if (!config) return;

      const value = values[field];
      const persistedValue = persistedValuesRef.current[field];

      if (value === persistedValue) return;

      const validation = profileFieldValidationSchemas[field].safeParse(value);
      if (!validation.success) {
        notifications.show(
          errorNotificationTemplate({
            title: copy.validationErrorTitle,
            description: firstZodErrorMessage(validation.error),
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
            title: copy.savedTitle,
            description: copy.fieldUpdated(config.successLabel),
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: copy.errorTitle,
            description: copy.updateFieldFailed(field),
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
    const { nameFieldConfigs, nameFieldValidationSchemas, copy } =
      useContactIdentityFieldConfigs();
    const { values, focusedField, savingByField, setFocusedField, updateField, handleBlur } =
      usePersonNameFields(
        personId,
        {
          firstName: initialFirstName,
          middleName: initialMiddleName,
          lastName: initialLastName,
        },
        nameFieldConfigs,
        isMyselfContact,
        nameFieldValidationSchemas,
        copy,
      );
    const [hoveredField, setHoveredField] = useState<NameField | null>(null);

    return (
      <Group grow gap={"xs"} wrap="nowrap">
        {nameFieldConfigs.map((config) => (
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
    {
      headline: contact.headline || "",
      location: contact.location || "",
    },
    profileFieldConfigs,
    profileFieldValidationSchemas,
    copy,
  );

  return (
    <Group align="center">
      <ContactPhotoUploadButton
        avatarUrl={contact.avatar || null}
        contactName={
          `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || copy.contactNameFallback
        }
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
            aria-label={headlineConfig?.placeholder ?? ""}
            placeholder={headlineConfig?.placeholder ?? ""}
            value={profileValues.headline}
            onChange={(value) => updateProfileField("headline", value)}
            onFocus={() => setFocusedProfileField("headline")}
            onBlur={() => handleProfileBlur("headline")}
            isSaving={savingProfileByField.headline}
            isFocused={focusedProfileField === "headline"}
            showCounter
            maxLength={CONTACT_FIELD_MAX_LENGTHS.headline}
            leftSection={<IconBriefcase size={18} />}
          />

          <div style={{ flex: 1 }}>
            <LocationLookupInput
              ariaLabel={locationConfig?.placeholder ?? ""}
              placeholder={locationConfig?.placeholder ?? ""}
              value={profileValues.location}
              disabled={savingProfileByField.location}
              mode="place"
              onChange={(value) => updateProfileField("location", value)}
              onSuggestionSelect={(selected) => {
                void savePlaceFromSuggestion(
                  geocodeSuggestionDisplayLabel(selected),
                  selected.latitude,
                  selected.longitude,
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
