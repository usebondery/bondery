"use client";

import { Stack } from "@mantine/core";
import type { ReactNode } from "react";
import { createSocialUrl, normalizeWebsiteUrl } from "@bondery/helpers";
import { parsePhoneNumber } from "@bondery/helpers/phone";
import { SocialFieldRerouteNudge } from "./SocialFieldRerouteNudge";
import { SocialHandleInput } from "./SocialHandleInput";
import { SocialPhoneInput } from "./SocialPhoneInput";
import { SocialPopoverButton } from "./SocialPopoverButton";
import type { SocialFieldKey, useSocialFieldEditor } from "./useSocialFieldEditor";
type SocialFieldEditor = ReturnType<typeof useSocialFieldEditor>;

export interface SocialPopoverFieldConfig {
  field: SocialFieldKey;
  color: string;
  icon: ReactNode;
  placeholder: string;
  label: string;
  tooltipLabel: string;
  target?: "_blank";
  kind: "handle" | "phone";
}

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

  return normalizeWebsiteUrl(website) || undefined;
}

function getExternalHref(
  field: SocialFieldKey,
  persistedValue: string,
): string | undefined {
  if (!persistedValue) {
    return undefined;
  }

  if (field === "website") {
    return getWebsiteUrl(persistedValue);
  }

  if (field === "signal") {
    const digits = persistedValue.replace(/\D/g, "");
    return digits ? `signal://signal.me/#p/${digits}` : undefined;
  }

  if (field === "linkedin" || field === "instagram" || field === "facebook" || field === "whatsapp") {
    return createSocialUrl(field, persistedValue);
  }

  return undefined;
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
    void editor.handlePasteAndCommit(field, raw);
  };

  return (
    <SocialPopoverButton
      field={field}
      isOpen={editor.openField === field}
      color={config.color}
      ariaLabel={config.label}
      tooltipLabel={config.tooltipLabel}
      href={href}
      disabled={isDisabled}
      loading={isSaving}
      target={config.target}
      icon={config.icon}
      onHoverOpen={(id) => void editor.requestOpen(id)}
      onLinkClick={() => editor.closeField(field)}
      onScheduleClose={editor.scheduleCloseField}
      onCancelClose={editor.clearCloseTimeout}
    >
      <Stack gap="xs" w={config.kind === "phone" ? 390 : 320}>
        {config.kind === "phone" ? (
          <SocialPhoneInput
            field={field as "whatsapp" | "signal"}
            label={config.label}
            placeholder={config.placeholder}
            value={editor.drafts[field]}
            prefix={field === "whatsapp" ? editor.whatsappPrefix : editor.signalPrefix}
            disabled={isSaving}
            autoFocus={editor.openField === field && editor.focusInputOnOpen}
            onPrefixChange={field === "whatsapp" ? editor.setWhatsappPrefix : editor.setSignalPrefix}
            onValueChange={(value) => editor.setDraft(field, value)}
            onPaste={handlePaste}
            onCommit={() => void editor.commitAndCloseField(field)}
            onDiscard={() => editor.handleEscape(field)}
          />
        ) : (
          <SocialHandleInput
            field={field}
            label={config.label}
            placeholder={config.placeholder}
            value={editor.drafts[field]}
            error={editor.getFieldError(field)}
            disabled={isSaving}
            autoFocus={editor.openField === field && editor.focusInputOnOpen}
            onChange={(value) => editor.setDraft(field, value)}
            onPaste={handlePaste}
            onCommit={() => void editor.commitAndCloseField(field)}
            onDiscard={() => editor.handleEscape(field)}
          />
        )}
        {rerouteSuggestion ? (
          <SocialFieldRerouteNudge
            field={field}
            suggestion={rerouteSuggestion}
            fieldLabels={fieldLabels}
            disabled={isSaving}
            onMove={() => void editor.acceptReroute({ replace: false })}
            onReplace={() => void editor.acceptReroute({ replace: true })}
            onKeepHere={() => void editor.keepInCurrentField()}
          />
        ) : null}
      </Stack>
    </SocialPopoverButton>
  );
}