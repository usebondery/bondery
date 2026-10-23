import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import { syncEffectState } from "../../../lib/react/syncEffectState";
import { useFloatingChrome } from "../../navigation/floatingChromeContext";
import { useContactsSelectionMode } from "../contactsSelectionStore";

/**
 * Registers the contacts selection action bar slot once per selection session.
 */
export function ContactsSelectionChromeRegistrar() {
  const isFocused = useIsFocused();
  const selectionMode = useContactsSelectionMode();
  const { setActionBarSlot, clearActionBarSlot } = useFloatingChrome();

  useEffect(() => {
    if (!selectionMode || !isFocused) {
      syncEffectState(() => {
        clearActionBarSlot();
      });
      return;
    }

    syncEffectState(() => {
      setActionBarSlot("contacts-selection");
    });

    return () => {
      clearActionBarSlot();
    };
  }, [clearActionBarSlot, isFocused, selectionMode, setActionBarSlot]);

  return null;
}
