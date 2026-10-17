import { StyleSheet } from "react-native";
import { MOBILE_LAYOUT } from "../../theme/tokens";

const SHEET_RADIUS = 20;

export const loginScreenStyles = StyleSheet.create({
  emailPanel: {
    gap: 10,
    width: "100%",
  },
  flex: {
    flex: 1,
  },
  hero: {
    alignItems: "center",
    flex: 3,
    justifyContent: "center",
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
  },
  logotype: {
    height: 36,
    width: 122,
  },
  providers: {
    gap: 10,
    width: "100%",
  },
  screen: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    flex: 7,
    minHeight: 0,
    paddingTop: 10,
  },
  sheetContent: {
    alignSelf: "center",
    flexGrow: 1,
    justifyContent: "flex-start",
    maxWidth: 440,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingVertical: 16,
    width: "100%",
  },
  sheetGroup: {
    // Matches webapp SocialLoginCard `Stack gap="lg"` (heading → first control).
    gap: 20,
    width: "100%",
  },
  sheetHeading: {
    gap: 6,
    width: "100%",
  },
  terms: {
    paddingTop: 4,
    width: "100%",
  },
  unavailableText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
