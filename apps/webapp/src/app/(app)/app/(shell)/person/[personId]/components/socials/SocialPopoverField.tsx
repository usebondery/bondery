"use client";

import { createSocialUrl, normalizeWebsiteUrl } from "@bondery/helpers";
import { detachPromise } from "@bondery/helpers/async";
import { parsePhoneNumber } from "@bondery/helpers/phone";
import { Stack } from "@mantine/core";
import type { ReactNode } from "react";
import { nonEmpty } from "@/lib/shared/nonEmpty";
import type { SocialFieldKey, useSocialFieldEditor } from "../../hooks/useSocialFieldEditor";
import { SocialFieldRerouteNudge } from "./SocialFieldRerouteNudge";
import { SocialHandleInput } from "./SocialHandleInput";
import { SocialPhoneInput } from "./SocialPhoneInput";
import { SocialPopoverButton } from "./SocialPopoverButton";

type SocialFieldEditor = ReturnType<typeof useSocialFieldEditor>;

interface SocialPopoverFieldProps {
  config: SocialPopoverFieldConfig;
  editor: SocialFieldEditor;
  fieldLabels: Record<SocialFieldKey, string>;
}
function getWebsiteUrl(website: string | null): string | undefined {
  if (!website) {
    return undefined;
  }

  if (website.startsWith("http://") || website.startsWith("https://")) {
    return website;
  }

  return nonEmpty(normalizeWebsiteUrl(website));
}

function getExternalHref(field: SocialFieldKey, persistedValue: string): string | undefined {
  if (!persistedValue) {
    return undefined;
  }

  if (field === "website") {
    return getWebsiteUrl(persistedValue);
  }

  if (field === "signal") {
    const digits = persistedValue.replace(/\D/gu, "");
    return digits ? `signal://signal.me/#p/${digits}` : undefined;
  }

  if (
    field === "linkedin" ||
    field === "instagram" ||
    field === "facebook" ||
    field === "whatsapp"
  ) {
    return createSocialUrl(field, persistedValue);
  }

  return undefined;
}

export interface SocialPopoverFieldConfig {
  color: string;
  field: SocialFieldKey;
  icon: ReactNode;
  kind: "handle" | "phone";
  label: string;
  placeholder: string;
  target?: "_blank";
  tooltipLabel: string;
}

export function SocialPopoverField({ config, editor, fieldLabels }: SocialPopoverFieldProps) {
  const { field } = config;
  const persistedValue = editor.persisted[field];
  const hasPersistedPhone = Boolean(parsePhoneNumber(persistedValue || "")?.number.trim());
  const isDisabled = config.kind === "phone" ? !hasPersistedPhone : !persistedValue;
  const rerouteSuggestion = editor.getRerouteSuggestion(field);
  const isSaving = editor.isSaving(field);

  const href = getExternalHref(field, persistedValue);

  const handlePaste = (raw: string) => {
    detachPromise(editor.handlePasteAndCommit(field, raw));
  };

  return (
    <SocialPopoverButton
      ariaLabel={config.label}
      color={config.color}
      disabled={isDisabled}
      field={field}
      href={href}
      icon={config.icon}
      isOpen={editor.openField === field}
      loading={isSaving}
      onCancelClose={editor.clearCloseTimeout}
      onHoverOpen={(id) => detachPromise(editor.requestOpen(id))}
      onLinkClick={() => editor.closeField(field)}
      onScheduleClose={editor.scheduleCloseField}
      target={config.target}
      tooltipLabel={config.tooltipLabel}
    >
      <Stack gap="xs" w={config.kind === "phone" ? 390 : 320}>
        {config.kind === "phone" ? (
          <SocialPhoneInput
            autoFocus={editor.openField === field && editor.focusInputOnOpen}
            disabled={isSaving}
            field={field as "whatsapp" | "signal"}
            label={config.label}
            onCommit={() => detachPromise(editor.commitAndCloseField(field))}
            onDiscard={() => editor.handleEscape(field)}
            onPaste={handlePaste}
            onPrefixChange={
              field === "whatsapp" ? editor.setWhatsappPrefix : editor.setSignalPrefix
            }
            onValueChange={(value) => editor.setDraft(field, value)}
            placeholder={config.placeholder}
            prefix={field === "whatsapp" ? editor.whatsappPrefix : editor.signalPrefix}
            value={editor.drafts[field]}
          />
        ) : (
          <SocialHandleInput
            autoFocus={editor.openField === field && editor.focusInputOnOpen}
            disabled={isSaving}
            error={editor.getFieldError(field)}
            field={field}
            label={config.label}
            onChange={(value) => editor.setDraft(field, value)}
            onCommit={() => detachPromise(editor.commitAndCloseField(field))}
            onDiscard={() => editor.handleEscape(field)}
            onPaste={handlePaste}
            placeholder={config.placeholder}
            value={editor.drafts[field]}
          />
        )}
        {rerouteSuggestion ? (
          <SocialFieldRerouteNudge
            disabled={isSaving}
            field={field}
            fieldLabels={fieldLabels}
            onKeepHere={() => detachPromise(editor.keepInCurrentField())}
            onMove={() => detachPromise(editor.acceptReroute({ replace: false }))}
            onReplace={() => detachPromise(editor.acceptReroute({ replace: true }))}
            suggestion={rerouteSuggestion}
          />
        ) : null}
      </Stack>
    </SocialPopoverButton>
  );
}
