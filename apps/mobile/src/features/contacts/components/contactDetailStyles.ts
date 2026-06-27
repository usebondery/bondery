import { StyleSheet } from "react-native";
import { MOBILE_TEXT_STYLES, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

export const contactDetailStyles = StyleSheet.create({
  section: {
    marginBottom: 24,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 2,
  },
  sectionTitle: {
    flex: 1,
  },
  sectionHeaderAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  sectionHeaderActionText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardPressable: {
    flex: 1,
  },
  cardLeadingIcon: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  cardPrimary: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  preferredBadge: {
    gap: 4,
  },
  typeEmoji: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sectionLabel,
  },
  badgeText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sectionLabel,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  emptyCard: {
    gap: 12,
  },
  emptyText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  addButtonText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoTexts: {
    flex: 1,
    gap: 4,
  },
  sectionLabel: {
    ...MOBILE_TEXT_STYLES.sectionLabel,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
});
