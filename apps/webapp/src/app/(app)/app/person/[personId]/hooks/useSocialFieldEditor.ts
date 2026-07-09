"use client";

import { analyzeSocialFieldInput, resolveContactSocialFieldCommit } from "@bondery/helpers";
import { parsePhoneNumber } from "@bondery/helpers/phone";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import type { Contact } from "@bondery/schemas";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useUpdateContactMutation } from "@/lib/query/hooks/useContacts";
import {
  createEmptySavingByField,
  getDisplayDraftForPersisted,
  getDisplayValues,
  getPersistedValues,
  isSavableSocialField,
  type RerouteSuggestion,
  type SocialFieldKey,
  type SocialFieldValues,
} from "../utils/socialFieldEditorTypes";
import { useSocialFieldEditorInteractions } from "./useSocialFieldEditorInteractions";

export type { RerouteSuggestion, SocialFieldKey } from "../utils/socialFieldEditorTypes";
export { isSavableSocialField } from "../utils/socialFieldEditorTypes";

interface UseSocialFieldEditorOptions {
  contact: Contact;
  fieldLabels: Record<SocialFieldKey, string>;
  personId: string;
  validationErrorTitle: string;
}

export function useSocialFieldEditor({
  contact,
  personId,
  fieldLabels,
  validationErrorTitle,
}: UseSocialFieldEditorOptions) {
  const t = useWebTranslations("Socials");
  const tCommon = useCommonTranslations();
  const updateContactMutation = useUpdateContactMutation(personId);

  const [drafts, setDrafts] = useState<SocialFieldValues>(() => getDisplayValues(contact));
  const [persisted, setPersisted] = useState<SocialFieldValues>(() => getPersistedValues(contact));
  const draftsRef = useRef(drafts);
  const persistedRef = useRef(persisted);

  const [whatsappPrefix, setWhatsappPrefix] = useState(
    () => parsePhoneNumber(contact.whatsapp || "")?.dialCode || "+1",
  );
  const [signalPrefix, setSignalPrefix] = useState(
    () => parsePhoneNumber(contact.signal || "")?.dialCode || "+1",
  );
  const whatsappPrefixRef = useRef(whatsappPrefix);
  const signalPrefixRef = useRef(signalPrefix);

  const [openField, setOpenField] = useState<string | null>(null);
  const openFieldRef = useRef<string | null>(null);
  const [focusInputOnOpen, setFocusInputOnOpen] = useState(false);

  const [savingByField, setSavingByField] = useState(createEmptySavingByField);
  const savingInFlightRef = useRef(createEmptySavingByField());

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SocialFieldKey, string>>>({});
  const [rerouteSuggestion, setRerouteSuggestion] = useState<RerouteSuggestion | null>(null);
  const keepHereFieldsRef = useRef<Set<SocialFieldKey>>(new Set());

  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    persistedRef.current = persisted;
  }, [persisted]);

  useEffect(() => {
    whatsappPrefixRef.current = whatsappPrefix;
  }, [whatsappPrefix]);

  useEffect(() => {
    signalPrefixRef.current = signalPrefix;
  }, [signalPrefix]);

  useEffect(() => {
    openFieldRef.current = openField;
  }, [openField]);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearCloseTimeout();
    },
    [clearCloseTimeout],
  );

  const getDialCode = useCallback((field: SocialFieldKey) => {
    if (field === "whatsapp") {
      return whatsappPrefixRef.current;
    }
    if (field === "signal") {
      return signalPrefixRef.current;
    }
    return undefined;
  }, []);

  const clearFieldError = useCallback((field: SocialFieldKey) => {
    setFieldErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }, []);

  const setDraft = useCallback(
    (field: SocialFieldKey, value: string) => {
      setDrafts((previous) => {
        const next = { ...previous, [field]: value };
        draftsRef.current = next;
        return next;
      });
      clearFieldError(field);
    },
    [clearFieldError],
  );

  const isDirty = useCallback(
    (field: SocialFieldKey) => {
      const resolution = resolveContactSocialFieldCommit(
        field,
        draftsRef.current[field] || "",
        persistedRef.current[field] || "",
        getDialCode(field) ? { dialCode: getDialCode(field) } : undefined,
      );
      return resolution.action !== "noop";
    },
    [getDialCode],
  );

  const discardField = useCallback(
    (field: SocialFieldKey) => {
      const persistedValue = persistedRef.current[field] || "";
      setDrafts((previous) => {
        const next = { ...previous, [field]: getDisplayDraftForPersisted(field, persistedValue) };
        draftsRef.current = next;
        return next;
      });

      if (field === "whatsapp") {
        const parsed = parsePhoneNumber(persistedValue);
        setWhatsappPrefix(parsed?.dialCode || "+1");
      } else if (field === "signal") {
        const parsed = parsePhoneNumber(persistedValue);
        setSignalPrefix(parsed?.dialCode || "+1");
      }

      clearFieldError(field);
    },
    [clearFieldError],
  );

  const applyFieldPatch = useCallback(
    async (
      field: SocialFieldKey,
      patchValue: string,
      options?: { showSuccessToast?: boolean },
    ): Promise<boolean> => {
      if (savingInFlightRef.current[field]) {
        return false;
      }

      savingInFlightRef.current[field] = true;
      setSavingByField((previous) => ({ ...previous, [field]: true }));

      try {
        await updateContactMutation.mutateAsync({ [field]: patchValue });

        persistedRef.current = { ...persistedRef.current, [field]: patchValue };
        setPersisted(persistedRef.current);

        const displayValue = getDisplayDraftForPersisted(field, patchValue);
        setDrafts((previous) => {
          const next = { ...previous, [field]: displayValue };
          draftsRef.current = next;
          return next;
        });

        if (field === "whatsapp" || field === "signal") {
          const parsed = parsePhoneNumber(patchValue);
          if (parsed) {
            if (field === "whatsapp") {
              setWhatsappPrefix(parsed.dialCode);
            } else {
              setSignalPrefix(parsed.dialCode);
            }
          }
        }

        clearFieldError(field);

        if (options?.showSuccessToast) {
          notifications.show(
            successNotificationTemplate({
              description: t("UpdateSuccess", { field: fieldLabels[field] }),
              title: tCommon("feedback.successTitle"),
            }),
          );
        }

        return true;
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description: t("UpdateError", { field: fieldLabels[field] }),
            title: tCommon("feedback.errorTitle"),
          }),
        );
        return false;
      } finally {
        savingInFlightRef.current[field] = false;
        setSavingByField((previous) => ({ ...previous, [field]: false }));
      }
    },
    [clearFieldError, fieldLabels, t, tCommon, updateContactMutation],
  );

  const dismissReroute = useCallback(() => {
    setRerouteSuggestion(null);
  }, []);

  const inspectDraftForReroute = useCallback(
    (field: SocialFieldKey, raw: string) => {
      if (keepHereFieldsRef.current.has(field)) {
        return;
      }

      const analysis = analyzeSocialFieldInput(field, raw, persistedRef.current[field] || "", {
        dialCode: getDialCode(field),
        persistedByField: persistedRef.current,
      });

      if (analysis.outcome === "suggest_reroute") {
        setRerouteSuggestion({
          fromField: field,
          reason: analysis.reason,
          targetHasValue: analysis.targetHasValue,
          toField: analysis.suggestedField,
          value: analysis.value,
        });
        return;
      }

      setRerouteSuggestion((current) => (current?.fromField === field ? null : current));
    },
    [getDialCode],
  );

  const commitField = useCallback(
    async (field: SocialFieldKey, options?: { skipReroute?: boolean }): Promise<boolean> => {
      if (savingInFlightRef.current[field]) {
        return false;
      }

      const skipReroute = options?.skipReroute || keepHereFieldsRef.current.has(field);

      const analysis = analyzeSocialFieldInput(
        field,
        draftsRef.current[field] || "",
        persistedRef.current[field] || "",
        {
          dialCode: getDialCode(field),
          persistedByField: persistedRef.current,
          skipReroute,
        },
      );

      if (analysis.outcome === "suggest_reroute") {
        setRerouteSuggestion({
          fromField: field,
          reason: analysis.reason,
          targetHasValue: analysis.targetHasValue,
          toField: analysis.suggestedField,
          value: analysis.value,
        });
        return false;
      }

      const resolution = analysis.action;

      if (resolution.action === "noop") {
        setRerouteSuggestion((current) => (current?.fromField === field ? null : current));
        discardField(field);
        return true;
      }

      if (resolution.action === "error") {
        const message =
          resolution.code === "invalid_website" ? t("InvalidWebsiteUrl") : validationErrorTitle;
        setFieldErrors((previous) => ({ ...previous, [field]: message }));
        notifications.show(
          errorNotificationTemplate({
            description: message,
            title: validationErrorTitle,
          }),
        );
        return false;
      }

      const patchValue = resolution.action === "clear" ? "" : resolution.value;
      const showSuccessToast = resolution.action === "save";

      const ok = await applyFieldPatch(field, patchValue, { showSuccessToast });
      if (ok) {
        setRerouteSuggestion((current) => (current?.fromField === field ? null : current));
      }

      return ok;
    },
    [applyFieldPatch, discardField, getDialCode, t, validationErrorTitle],
  );

  const closeField = useCallback(
    (field: string) => {
      clearCloseTimeout();
      setOpenField((current) => (current === field ? null : current));
      setFocusInputOnOpen(false);
      setRerouteSuggestion((current) => (current?.fromField === field ? null : current));
    },
    [clearCloseTimeout],
  );

  const acceptReroute = useCallback(
    async ({ replace }: { replace: boolean }) => {
      const suggestion = rerouteSuggestion;
      if (!suggestion) {
        return false;
      }

      if (suggestion.targetHasValue && !replace) {
        return false;
      }

      const { fromField, toField, value } = suggestion;
      const targetPersisted = persistedRef.current[toField] || "";
      const showSuccessToast = value !== targetPersisted.trim();

      const ok = await applyFieldPatch(toField, value, { showSuccessToast });
      if (!ok) {
        return false;
      }

      discardField(fromField);
      setRerouteSuggestion(null);
      closeField(fromField);
      return true;
    },
    [applyFieldPatch, closeField, discardField, rerouteSuggestion],
  );

  const keepInCurrentField = useCallback(async () => {
    const suggestion = rerouteSuggestion;
    if (!suggestion) {
      return false;
    }

    keepHereFieldsRef.current.add(suggestion.fromField);
    setRerouteSuggestion(null);
    return commitField(suggestion.fromField, { skipReroute: true });
  }, [commitField, rerouteSuggestion]);

  const {
    commitAndCloseField,
    handleEscape,
    handlePasteAndCommit,
    requestOpen,
    requestToggle,
    scheduleCloseField,
  } = useSocialFieldEditorInteractions({
    clearCloseTimeout,
    closeField,
    closeTimeoutRef,
    commitField,
    discardField,
    dismissReroute,
    draftsRef,
    getDialCode,
    isDirty,
    keepHereFieldsRef,
    openFieldRef,
    persistedRef,
    setDraft,
    setFocusInputOnOpen,
    setOpenField,
    setRerouteSuggestion,
  });

  useEffect(() => {
    const nextPersisted = getPersistedValues(contact);
    const nextDisplay = getDisplayValues(contact);
    const open = openFieldRef.current;

    persistedRef.current = nextPersisted;
    setPersisted(nextPersisted);

    setWhatsappPrefix(parsePhoneNumber(nextPersisted.whatsapp || "")?.dialCode || "+1");
    setSignalPrefix(parsePhoneNumber(nextPersisted.signal || "")?.dialCode || "+1");

    setDrafts((previous) => {
      if (open && isSavableSocialField(open)) {
        const resolution = resolveContactSocialFieldCommit(
          open,
          previous[open] || "",
          persistedRef.current[open] || "",
          open === "whatsapp"
            ? { dialCode: whatsappPrefixRef.current }
            : open === "signal"
              ? { dialCode: signalPrefixRef.current }
              : undefined,
        );
        if (resolution.action !== "noop") {
          return { ...nextDisplay, [open]: previous[open] };
        }
      }

      draftsRef.current = nextDisplay;
      return nextDisplay;
    });
  }, [contact]);

  return {
    acceptReroute,
    clearCloseTimeout,
    closeField,
    commitAndCloseField,
    commitField,
    discardField,
    dismissReroute,
    drafts,
    fieldErrors,
    focusInputOnOpen,
    getFieldError: (field: SocialFieldKey) => fieldErrors[field],
    getRerouteSuggestion: (field: SocialFieldKey) =>
      rerouteSuggestion?.fromField === field ? rerouteSuggestion : null,
    handleEscape,
    handlePasteAndCommit,
    inspectDraftForReroute,
    isDirty,
    isSaving: (field: SocialFieldKey) => savingByField[field],
    keepInCurrentField,
    openField,
    persisted,
    requestOpen,
    requestToggle,
    rerouteSuggestion,
    savingByField,
    scheduleCloseField,
    setDraft,
    setSignalPrefix,
    setWhatsappPrefix,
    signalPrefix,
    whatsappPrefix,
  };
}
