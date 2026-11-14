import { fontStackForLocale } from "@bondery/schemas/locale";
import type { CSSProperties } from "react";

export function localeBodyFontStyle(locale: string): CSSProperties | undefined {
  const stack = fontStackForLocale(locale);
  if (!stack) {
    return undefined;
  }
  return { fontFamily: stack };
}
