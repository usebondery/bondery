import { useEffect } from "react";
import { BackHandler } from "react-native";
import { useContactsSelection, useContactsSelectionMode } from "../contactsSelectionStore";

/** Handles Android back while contacts selection is active. */
export function ContactsSelectionBackHandler() {
  const selectionMode = useContactsSelectionMode();
  const isAllTotalSelected = useContactsSelection((state) => state.isAllTotalSelected);
  const loadedContactCount = useContactsSelection((state) => state.loadedContactCount);
  const exitSelectionMode = useContactsSelection((state) => state.exitSelectionMode);

  useEffect(() => {
    if (!selectionMode) {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      exitSelectionMode({
        useTransition: isAllTotalSelected && loadedContactCount >= 20,
      });
      return true;
    });

    return () => subscription.remove();
  }, [exitSelectionMode, isAllTotalSelected, loadedContactCount, selectionMode]);

  return null;
}
