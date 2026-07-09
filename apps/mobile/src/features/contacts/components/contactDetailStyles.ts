import { StyleSheet } from "react-native";
import { MOBILE_TEXT_STYLES, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

export const contactDetailStyles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 4,
  },
  addButtonText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  badge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badgeText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sectionLabel,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardLeadingIcon: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
    width: 20,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  cardPressable: {
    flex: 1,
  },
  cardPrimary: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  cardRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  emptyCard: {
    gap: 12,
  },
  emptyText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    lineHeight: 20,
  },
  infoRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  infoTexts: {
    flex: 1,
    gap: 4,
  },
  infoValue: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  preferredBadge: {
    gap: 4,
  },
  section: {
    gap: 8,
    marginBottom: 24,
  },
  sectionHeaderAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingVertical: 4,
  },
  sectionHeaderActionText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 2,
  },
  sectionLabel: {
    ...MOBILE_TEXT_STYLES.sectionLabel,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    flex: 1,
  },
  typeEmoji: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sectionLabel,
  },
});
