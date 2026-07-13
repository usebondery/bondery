import type { TextStyle } from "react-native";
import { MOBILE_LAYOUT } from "./layout";

/** Shared font sizes and weights used across mobile screens. */
export const MOBILE_TYPOGRAPHY = {
  fontSize: {
    body: 14,
    bodyLarge: 15,
    caption: 13,
    cardTitle: 16,
    largeTitle: MOBILE_LAYOUT.screenChrome.largeTitleFontSize,
    menuAction: 13,
    navTitle: 17,
    sectionLabel: 11,
    sheetTitle: 18,
  },
  fontWeight: {
    bold: "700" as const,
    medium: "500" as const,
    semibold: "600" as const,
  },
  letterSpacing: {
    sectionLabel: 0.8,
  },
} as const;

/** Ready-made text styles for repeated UI patterns. */
export const MOBILE_TEXT_STYLES = {
  buttonLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  cardTitle: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.cardTitle,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  fieldLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  largeTitle: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.largeTitle,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    lineHeight: MOBILE_LAYOUT.screenChrome.titleRowHeight,
  },
  listSectionHeader: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  navTitle: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.navTitle,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  sectionLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sectionLabel,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    letterSpacing: MOBILE_TYPOGRAPHY.letterSpacing.sectionLabel,
    textTransform: "uppercase",
  },
} as const satisfies Record<string, TextStyle>;
