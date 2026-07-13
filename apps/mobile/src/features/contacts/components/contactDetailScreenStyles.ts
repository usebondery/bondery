import { StyleSheet } from "react-native";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

export const contactDetailScreenStyles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    gap: 6,
  },
  actionIcon: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.touchTargetLarge / 2,
    height: MOBILE_LAYOUT.touchTargetLarge,
    justifyContent: "center",
    width: MOBILE_LAYOUT.touchTargetLarge,
  },
  avatarCircle: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.avatar.heroRadius,
    height: MOBILE_LAYOUT.avatar.hero,
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
    width: MOBILE_LAYOUT.avatar.hero,
  },
  avatarImage: {
    height: MOBILE_LAYOUT.avatar.hero,
    width: MOBILE_LAYOUT.avatar.hero,
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 1,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 24,
  },
  heroHeaderSpacer: {
    flex: 1,
  },
  heroHeadline: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    textAlign: "center",
  },
  heroName: {
    fontSize: 24,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    textAlign: "center",
  },
  heroPlace: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    textAlign: "center",
  },
  heroSection: {
    marginBottom: 4,
  },
  notesCollapsed: {
    maxHeight: 88,
    overflow: "hidden",
  },
  notesPlaceholder: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontStyle: "italic",
    lineHeight: 20,
  },
  quickActions: {
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    marginBottom: 24,
    paddingBottom: 24,
  },
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  showMoreButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 10,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
