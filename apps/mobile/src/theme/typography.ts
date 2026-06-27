import type { TextStyle } from "react-native";
import { MOBILE_LAYOUT } from "./layout";

/** Shared font sizes and weights used across mobile screens. */
export const MOBILE_TYPOGRAPHY = {
  fontSize: {
    sectionLabel: 11,
    caption: 13,
    body: 14,
    bodyLarge: 15,
    cardTitle: 16,
    navTitle: 17,
    sheetTitle: 18,
    menuAction: 13,
    largeTitle: MOBILE_LAYOUT.screenChrome.largeTitleFontSize,
  },
  fontWeight: {
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  letterSpacing: {
    sectionLabel: 0.8,
  },
} as const;

/** Ready-made text styles for repeated UI patterns. */
export const MOBILE_TEXT_STYLES = {
  sectionLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sectionLabel,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    letterSpacing: MOBILE_TYPOGRAPHY.letterSpacing.sectionLabel,
    textTransform: "uppercase",
  },
  buttonLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  navTitle: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.navTitle,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  cardTitle: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.cardTitle,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  fieldLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  listSectionHeader: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  largeTitle: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.largeTitle,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    lineHeight: MOBILE_LAYOUT.screenChrome.titleRowHeight,
  },
} as const satisfies Record<string, TextStyle>;
