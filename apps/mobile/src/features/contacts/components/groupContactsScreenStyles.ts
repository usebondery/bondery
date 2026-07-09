import { StyleSheet } from "react-native";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

export const groupContactsScreenStyles = StyleSheet.create({
  centeredState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: MOBILE_LAYOUT.floatingTabBar.screenHeaderInset,
  },
  duplicateDialogBody: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
  },
  listContainer: {
    flex: 1,
  },
  listGestureTarget: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  searchInput: {
    paddingVertical: 10,
  },
  searchRow: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchSpinner: {
    alignItems: "center",
    justifyContent: "center",
    width: 20,
  },
});
