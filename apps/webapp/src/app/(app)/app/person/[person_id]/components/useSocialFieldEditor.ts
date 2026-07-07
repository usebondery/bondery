"use client";

import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Contact } from "@bondery/schemas";
import {
  analyzeSocialFieldInput,
  type ContactSocialFieldKey,
  type SocialInputRerouteReason,
  resolveContactSocialFieldCommit,
} from "@bondery/helpers";
import { parsePhoneNumber } from "@bondery/helpers/phone";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import { useUpdateContactMutation } from "@/lib/query/hooks/useContacts";

export type SocialFieldKey = ContactSocialFieldKey;

export interface RerouteSuggestion {
  fromField: SocialFieldKey;
  toField: SocialFieldKey;
  value: string;
  reason: SocialInputRerouteReason;
  targetHasValue: boolean;
}

const SAVABLE_FIELDS = new Set<SocialFieldKey>([
  "linkedin",
  "instagram",
  "facebook",
  "website",
  "whatsapp",
  "signal",
]);

export function isSavableSocialField(field: string): field is SocialFieldKey {
  return SAVABLE_FIELDS.has(field as SocialFieldKey);
}

type SocialFieldValues = Record<SocialFieldKey, string>;

function getDisplayValues(contact: Contact): SocialFieldValues {
  const whatsappParsed = parsePhoneNumber(contact.whatsapp || "");
  const signalParsed = parsePhoneNumber(contact.signal || "");

  return {
    linkedin: contact.linkedin || "",
    instagram: contact.instagram || "",
    facebook: contact.facebook || "",
    website: contact.website || "",
    whatsapp: whatsappParsed?.number || "",
    signal: signalParsed?.number || "",
  };
}

function getPersistedValues(contact: Contact): SocialFieldValues {
  return {
    linkedin: contact.linkedin || "",
    instagram: contact.instagram || "",
    facebook: contact.facebook || "",
    website: contact.website || "",
    whatsapp: contact.whatsapp || "",
    signal: contact.signal || "",
  };
}

const CLOSE_DELAY_MS = 140;

interface UseSocialFieldEditorOptions {
  contact: Contact;
  personId: string;
  fieldLabels: Record<SocialFieldKey, string>;
  t: (key: string, values?: Record<string, string>) => string;
  tCommon: (key: string) => string;
}

export function useSocialFieldEditor({
  contact,
  personId,
  fieldLabels,
  t,
  tCommon,
}: UseSocialFieldEditorOptions) {
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

  const [savingByField, setSavingByField] = useState<Record<SocialFieldKey, boolean>>({
    linkedin: false,
    instagram: false,
    facebook: false,
    website: false,
    whatsapp: false,
    signal: false,
  });
  const savingInFlightRef = useRef<Record<SocialFieldKey, boolean>>({
    linkedin: false,
    instagram: false,
    facebook: false,
    website: false,
    whatsapp: false,
    signal: false,
  });

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
    if (field === "whatsapp") return whatsappPrefixRef.current;
    if (field === "signal") return signalPrefixRef.current;
    return undefined;
  }, []);

  const clearFieldError = useCallback((field: SocialFieldKey) => {
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }, []);

  const setDraft = useCallback((field: SocialFieldKey, value: string) => {
    setDrafts((previous) => {
      const next = { ...previous, [field]: value };
      draftsRef.current = next;
      return next;
    });
    clearFieldError(field);
  }, [clearFieldError]);

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

  const discardField = useCallback((field: SocialFieldKey) => {
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
  }, [clearFieldError]);

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
              title: tCommon("SuccessTitle"),
              description: t("UpdateSuccess", { field: fieldLabels[field] }),
            }),
          );
        }

        return true;
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: tCommon("ErrorTitle"),
            description: t("UpdateError", { field: fieldLabels[field] }),
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

      const analysis = analyzeSocialFieldInput(
        field,
        raw,
        persistedRef.current[field] || "",
        {
          dialCode: getDialCode(field),
          persistedByField: persistedRef.current,
        },
      );

      if (analysis.outcome === "suggest_reroute") {
        setRerouteSuggestion({
          fromField: field,
          toField: analysis.suggestedField,
          value: analysis.value,
          reason: analysis.reason,
          targetHasValue: analysis.targetHasValue,
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
          skipReroute,
          persistedByField: persistedRef.current,
        },
      );

      if (analysis.outcome === "suggest_reroute") {
        setRerouteSuggestion({
          fromField: field,
          toField: analysis.suggestedField,
          value: analysis.value,
          reason: analysis.reason,
          targetHasValue: analysis.targetHasValue,
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
          resolution.code === "invalid_website"
            ? t("InvalidWebsiteUrl")
            : t("ValidationErrorTitle");
        setFieldErrors((previous) => ({ ...previous, [field]: message }));
        notifications.show(
          errorNotificationTemplate({
            title: t("ValidationErrorTitle"),
            description: message,
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
    [applyFieldPatch, getDialCode, t],
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

  const commitAndCloseField = useCallback(
    async (field: SocialFieldKey) => {
      const shouldClose = openFieldRef.current === field;
      const ok = await commitField(field);
      if (shouldClose && (ok || !isDirty(field))) {
        closeField(field);
      }
      return ok;
    },
    [closeField, commitField, isDirty],
  );

  const handlePasteAndCommit = useCallback(
    async (field: SocialFieldKey, raw: string) => {
      clearCloseTimeout();

      const trimmed = raw.trim();
      if (!trimmed) {
        return;
      }

      const isPhoneField = field === "whatsapp" || field === "signal";
      if (!isPhoneField) {
        setDraft(field, trimmed);
      } else {
        await new Promise<void>((resolve) => {
          queueMicrotask(() => resolve());
        });
      }

      const draftValue = draftsRef.current[field] || "";

      if (keepHereFieldsRef.current.has(field)) {
        await commitAndCloseField(field);
        return;
      }

      const analysis = analyzeSocialFieldInput(
        field,
        draftValue,
        persistedRef.current[field] || "",
        {
          dialCode: getDialCode(field),
          persistedByField: persistedRef.current,
        },
      );

      if (analysis.outcome === "suggest_reroute") {
        setRerouteSuggestion({
          fromField: field,
          toField: analysis.suggestedField,
          value: analysis.value,
          reason: analysis.reason,
          targetHasValue: analysis.targetHasValue,
        });
        return;
      }

      await commitAndCloseField(field);
    },
    [clearCloseTimeout, commitAndCloseField, getDialCode, setDraft],
  );

  const scheduleCloseField = useCallback(
    (field: string) => {
      clearCloseTimeout();
      closeTimeoutRef.current = window.setTimeout(() => {
        if (isSavableSocialField(field)) {
          void commitAndCloseField(field);
          return;
        }
        closeField(field);
      }, CLOSE_DELAY_MS);
    },
    [clearCloseTimeout, closeField, commitAndCloseField],
  );

  const requestOpen = useCallback(
    async (field: string) => {
      clearCloseTimeout();

      const current = openFieldRef.current;
      if (current && current !== field && isSavableSocialField(current)) {
        await commitField(current);
      }

      setOpenField(field);
      setFocusInputOnOpen(true);
    },
    [clearCloseTimeout, commitField],
  );

  const requestToggle = useCallback(
    (field: string) => {
      if (openFieldRef.current === field) {
        if (isSavableSocialField(field)) {
          void commitAndCloseField(field);
        } else {
          closeField(field);
        }
        return;
      }

      void requestOpen(field);
    },
    [closeField, commitAndCloseField, requestOpen],
  );

  const handleEscape = useCallback(
    (field: SocialFieldKey) => {
      dismissReroute();
      discardField(field);
      closeField(field);
    },
    [closeField, discardField, dismissReroute],
  );

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
  }, [contact, personId]);

  return {
    drafts,
    persisted,
    openField,
    focusInputOnOpen,
    savingByField,
    fieldErrors,
    rerouteSuggestion,
    whatsappPrefix,
    signalPrefix,
    setWhatsappPrefix,
    setSignalPrefix,
    setDraft,
    isDirty,
    isSaving: (field: SocialFieldKey) => savingByField[field],
    getFieldError: (field: SocialFieldKey) => fieldErrors[field],
    getRerouteSuggestion: (field: SocialFieldKey) =>
      rerouteSuggestion?.fromField === field ? rerouteSuggestion : null,
    requestOpen,
    requestToggle,
    scheduleCloseField,
    clearCloseTimeout,
    commitField,
    commitAndCloseField,
    discardField,
    handleEscape,
    closeField,
    acceptReroute,
    keepInCurrentField,
    dismissReroute,
    inspectDraftForReroute,
    handlePasteAndCommit,
  };
}

function getDisplayDraftForPersisted(field: SocialFieldKey, persistedValue: string): string {
  if (field === "whatsapp" || field === "signal") {
    return parsePhoneNumber(persistedValue)?.number || "";
  }

  return persistedValue;
}
