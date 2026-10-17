import { resolveTelephonePaste } from "@bondery/helpers/phone";
import type { ClipboardEvent } from "react";

export function handleTelephonePasteEvent(
  event: ClipboardEvent<HTMLInputElement>,
  options: {
    defaultCountry?: string | null;
    onApply: (normalized: { prefix: string; value: string }) => void;
  },
): void {
  const raw = event.clipboardData.getData("text");
  if (!raw.trim()) {
    return;
  }

  event.preventDefault();
  const parsed = resolveTelephonePaste(raw, { defaultCountry: options.defaultCountry });
  if (!parsed) {
    return;
  }

  options.onApply({ prefix: parsed.prefix, value: parsed.value });
}
