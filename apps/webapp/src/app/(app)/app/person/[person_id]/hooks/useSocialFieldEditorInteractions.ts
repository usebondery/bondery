"use client";

import { analyzeSocialFieldInput, resolveContactSocialFieldCommit } from "@bondery/helpers";
import { useCallback } from "react";
import {
  isSavableSocialField,
  type RerouteSuggestion,
  SOCIAL_FIELD_CLOSE_DELAY_MS,
  type SocialFieldKey,
} from "../utils/socialFieldEditorTypes";

interface UseSocialFieldEditorInteractionsOptions {
  clearCloseTimeout: () => void;
  closeField: (field: string) => void;
  closeTimeoutRef: React.MutableRefObject<number | null>;
  commitField: (field: SocialFieldKey, options?: { skipReroute?: boolean }) => Promise<boolean>;
  discardField: (field: SocialFieldKey) => void;
  dismissReroute: () => void;
  draftsRef: React.MutableRefObject<Record<SocialFieldKey, string>>;
  getDialCode: (field: SocialFieldKey) => string | undefined;
  isDirty: (field: SocialFieldKey) => boolean;
  keepHereFieldsRef: React.MutableRefObject<Set<SocialFieldKey>>;
  openFieldRef: React.MutableRefObject<string | null>;
  persistedRef: React.MutableRefObject<Record<SocialFieldKey, string>>;
  setDraft: (field: SocialFieldKey, value: string) => void;
  setFocusInputOnOpen: (value: boolean) => void;
  setOpenField: React.Dispatch<React.SetStateAction<string | null>>;
  setRerouteSuggestion: React.Dispatch<React.SetStateAction<RerouteSuggestion | null>>;
}

export function useSocialFieldEditorInteractions({
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
}: UseSocialFieldEditorInteractionsOptions) {
  const commitAndCloseField = useCallback(
    async (field: SocialFieldKey) => {
      const shouldClose = openFieldRef.current === field;
      const ok = await commitField(field);
      if (shouldClose && (ok || !isDirty(field))) {
        closeField(field);
      }
      return ok;
    },
    [closeField, commitField, isDirty, openFieldRef],
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
          reason: analysis.reason,
          targetHasValue: analysis.targetHasValue,
          toField: analysis.suggestedField,
          value: analysis.value,
        });
        return;
      }

      await commitAndCloseField(field);
    },
    [
      clearCloseTimeout,
      commitAndCloseField,
      draftsRef,
      getDialCode,
      keepHereFieldsRef,
      persistedRef,
      setDraft,
      setRerouteSuggestion,
    ],
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
      }, SOCIAL_FIELD_CLOSE_DELAY_MS);
    },
    [clearCloseTimeout, closeField, closeTimeoutRef, commitAndCloseField],
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
    [clearCloseTimeout, commitField, openFieldRef, setFocusInputOnOpen, setOpenField],
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
    [closeField, commitAndCloseField, openFieldRef, requestOpen],
  );

  const handleEscape = useCallback(
    (field: SocialFieldKey) => {
      dismissReroute();
      discardField(field);
      closeField(field);
    },
    [closeField, discardField, dismissReroute],
  );

  return {
    commitAndCloseField,
    handleEscape,
    handlePasteAndCommit,
    requestOpen,
    requestToggle,
    scheduleCloseField,
  };
}

export { resolveContactSocialFieldCommit };
