import { StyleSheet } from "react-native";
import { MOBILE_LAYOUT } from "../../../theme/tokens";

export const contactsScreenStyles = StyleSheet.create({
  centeredState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: MOBILE_LAYOUT.floatingTabBar.screenHeaderInset,
  },
  emptyText: {},
  footerLoader: {
    alignItems: "center",
    paddingVertical: 20,
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
  searchSpinner: {
    alignItems: "center",
    justifyContent: "center",
    width: 20,
  },
});
