"use client";

import { useMemo } from "react";
import { CONTACT_FIELD_MAX_LENGTHS } from "@bondery/schemas";
import { z } from "zod";
import { useWebTranslations as useTranslations } from "./useWebTranslations";

export type NameField = "firstName" | "middleName" | "lastName";
export type ProfileField = "headline" | "location";

export interface NameFieldConfig {
  field: NameField;
  placeholder: string;
  maxLength: number;
  required?: boolean;
  successLabel: string;
}

export interface ProfileFieldConfig {
  field: ProfileField;
  placeholder: string;
  maxLength: number;
  successLabel: string;
}

export function useContactIdentityFieldConfigs() {
  const t = useTranslations("ContactIdentityFields");
  const tCommon = useTranslations("WebAppCommon");

  const nameFieldConfigs = useMemo<NameFieldConfig[]>(
    () => [
      {
        field: "firstName",
        placeholder: t("FirstNamePlaceholder"),
        maxLength: CONTACT_FIELD_MAX_LENGTHS.firstName,
        required: true,
        successLabel: t("FirstNameSuccessLabel"),
      },
      {
        field: "middleName",
        placeholder: t("MiddleNamePlaceholder"),
        maxLength: CONTACT_FIELD_MAX_LENGTHS.middleName,
        successLabel: t("MiddleNameSuccessLabel"),
      },
      {
        field: "lastName",
        placeholder: t("LastNamePlaceholder"),
        maxLength: CONTACT_FIELD_MAX_LENGTHS.lastName,
        successLabel: t("LastNameSuccessLabel"),
      },
    ],
    [t],
  );

  const profileFieldConfigs = useMemo<ProfileFieldConfig[]>(
    () => [
      {
        field: "headline",
        placeholder: t("HeadlinePlaceholder"),
        maxLength: CONTACT_FIELD_MAX_LENGTHS.headline,
        successLabel: t("HeadlineSuccessLabel"),
      },
      {
        field: "location",
        placeholder: t("LocationPlaceholder"),
        maxLength: CONTACT_FIELD_MAX_LENGTHS.location,
        successLabel: t("LocationSuccessLabel"),
      },
    ],
    [t],
  );

  const nameFieldValidationSchemas = useMemo(
    () =>
      ({
        firstName: z
          .string()
          .trim()
          .min(1, { error: t("FirstNameRequired") })
          .max(CONTACT_FIELD_MAX_LENGTHS.firstName, {
            error: t("FirstNameMaxLength", { max: CONTACT_FIELD_MAX_LENGTHS.firstName }),
          }),
        middleName: z.string().trim().max(CONTACT_FIELD_MAX_LENGTHS.middleName, {
          error: t("MiddleNameMaxLength", { max: CONTACT_FIELD_MAX_LENGTHS.middleName }),
        }),
        lastName: z.string().trim().max(CONTACT_FIELD_MAX_LENGTHS.lastName, {
          error: t("LastNameMaxLength", { max: CONTACT_FIELD_MAX_LENGTHS.lastName }),
        }),
      }) satisfies Record<NameField, z.ZodType<string>>,
    [t],
  );

  const profileFieldValidationSchemas = useMemo(
    () =>
      ({
        headline: z.string().trim().max(CONTACT_FIELD_MAX_LENGTHS.headline, {
          error: t("HeadlineMaxLength", { max: CONTACT_FIELD_MAX_LENGTHS.headline }),
        }),
        location: z.string().trim().max(CONTACT_FIELD_MAX_LENGTHS.location, {
          error: t("LocationMaxLength", { max: CONTACT_FIELD_MAX_LENGTHS.location }),
        }),
      }) satisfies Record<ProfileField, z.ZodType<string>>,
    [t],
  );

  const copy = useMemo(
    () => ({
      savedTitle: t("SavedTitle"),
      validationErrorTitle: t("ValidationErrorTitle"),
      nameFieldUpdated: (label: string) => t("NameFieldUpdated", { label }),
      fieldUpdated: (label: string) => t("FieldUpdated", { label }),
      locationUpdated: t("LocationUpdated"),
      updateFieldFailed: (field: string) => t("UpdateFieldFailed", { field }),
      errorTitle: tCommon("ErrorTitle"),
      contactNameFallback: t("ContactNameFallback"),
    }),
    [t, tCommon],
  );

  return {
    nameFieldConfigs,
    profileFieldConfigs,
    nameFieldValidationSchemas,
    profileFieldValidationSchemas,
    copy,
  };
}
