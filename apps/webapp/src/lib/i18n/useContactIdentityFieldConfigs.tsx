"use client";

import { CONTACT_FIELD_MAX_LENGTHS } from "@bondery/schemas";
import { useMemo } from "react";
import { z } from "zod";
import { useCommonTranslations, useWebTranslations } from "./useWebTranslations";

export type NameField = "firstName" | "middleName" | "lastName";
export type ProfileField = "headline" | "location";

export interface NameFieldConfig {
  field: NameField;
  maxLength: number;
  placeholder: string;
  required?: boolean;
  successLabel: string;
}

export interface ProfileFieldConfig {
  field: ProfileField;
  maxLength: number;
  placeholder: string;
  successLabel: string;
}

export function useContactIdentityFieldConfigs() {
  const t = useWebTranslations("ContactIdentityFields");
  const tVal = useWebTranslations("validation", "fields");
  const tValRoot = useWebTranslations("validation");
  const tCommon = useCommonTranslations();

  const nameFieldConfigs = useMemo<NameFieldConfig[]>(
    () => [
      {
        field: "firstName",
        maxLength: CONTACT_FIELD_MAX_LENGTHS.firstName,
        placeholder: t("FirstNamePlaceholder"),
        required: true,
        successLabel: t("FirstNameSuccessLabel"),
      },
      {
        field: "middleName",
        maxLength: CONTACT_FIELD_MAX_LENGTHS.middleName,
        placeholder: t("MiddleNamePlaceholder"),
        successLabel: t("MiddleNameSuccessLabel"),
      },
      {
        field: "lastName",
        maxLength: CONTACT_FIELD_MAX_LENGTHS.lastName,
        placeholder: t("LastNamePlaceholder"),
        successLabel: t("LastNameSuccessLabel"),
      },
    ],
    [t],
  );

  const profileFieldConfigs = useMemo<ProfileFieldConfig[]>(
    () => [
      {
        field: "headline",
        maxLength: CONTACT_FIELD_MAX_LENGTHS.headline,
        placeholder: t("HeadlinePlaceholder"),
        successLabel: t("HeadlineSuccessLabel"),
      },
      {
        field: "location",
        maxLength: CONTACT_FIELD_MAX_LENGTHS.location,
        placeholder: t("LocationPlaceholder"),
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
          .min(1, { error: tVal("firstName.required") })
          .max(CONTACT_FIELD_MAX_LENGTHS.firstName, {
            error: tVal("firstName.maxLength", { max: CONTACT_FIELD_MAX_LENGTHS.firstName }),
          }),
        lastName: z
          .string()
          .trim()
          .max(CONTACT_FIELD_MAX_LENGTHS.lastName, {
            error: tVal("lastName.maxLength", { max: CONTACT_FIELD_MAX_LENGTHS.lastName }),
          }),
        middleName: z
          .string()
          .trim()
          .max(CONTACT_FIELD_MAX_LENGTHS.middleName, {
            error: tVal("middleName.maxLength", { max: CONTACT_FIELD_MAX_LENGTHS.middleName }),
          }),
      }) satisfies Record<NameField, z.ZodType<string>>,
    [tVal],
  );

  const profileFieldValidationSchemas = useMemo(
    () =>
      ({
        headline: z
          .string()
          .trim()
          .max(CONTACT_FIELD_MAX_LENGTHS.headline, {
            error: tVal("headline.maxLength", { max: CONTACT_FIELD_MAX_LENGTHS.headline }),
          }),
        location: z
          .string()
          .trim()
          .max(CONTACT_FIELD_MAX_LENGTHS.location, {
            error: tVal("location.maxLength", { max: CONTACT_FIELD_MAX_LENGTHS.location }),
          }),
      }) satisfies Record<ProfileField, z.ZodType<string>>,
    [tVal],
  );

  const copy = useMemo(
    () => ({
      contactNameFallback: t("ContactNameFallback"),
      errorTitle: tCommon("feedback.errorTitle"),
      fieldUpdated: (label: string) => t("FieldUpdated", { label }),
      locationUpdated: t("LocationUpdated"),
      nameFieldUpdated: (label: string) => t("NameFieldUpdated", { label }),
      savedTitle: t("SavedTitle"),
      updateFieldFailed: (field: string) => t("UpdateFieldFailed", { field }),
      validationErrorTitle: tValRoot("title"),
    }),
    [t, tCommon, tValRoot],
  );

  return {
    copy,
    nameFieldConfigs,
    nameFieldValidationSchemas,
    profileFieldConfigs,
    profileFieldValidationSchemas,
  };
}
