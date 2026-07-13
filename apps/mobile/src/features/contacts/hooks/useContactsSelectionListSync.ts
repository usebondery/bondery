import { useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { useContactsSelection } from "../contactsSelectionStore";

interface UseContactsSelectionListSyncOptions {
  contactIds: string[];
  myselfContactId?: string;
  totalCount: number;
}

/**
 * Keeps the shared selection store in sync with the current list and exits
 * selection when the screen loses focus.
 */
export function useContactsSelectionListSync({
  contactIds,
  totalCount,
  myselfContactId,
}: UseContactsSelectionListSyncOptions) {
  const exitSelectionMode = useContactsSelection((state) => state.exitSelectionMode);
  const setMyselfContactId = useContactsSelection((state) => state.setMyselfContactId);
  const setSelectionTotalCount = useContactsSelection((state) => state.setTotalCount);
  const setLoadedContactCount = useContactsSelection((state) => state.setLoadedContactCount);
  const pruneMyselfFromSelection = useContactsSelection((state) => state.pruneMyselfFromSelection);
  const pruneSelectionToKnownContactIds = useContactsSelection(
    (state) => state.pruneSelectionToKnownContactIds,
  );

  useEffect(() => {
    setMyselfContactId(myselfContactId);
    pruneMyselfFromSelection();
  }, [myselfContactId, pruneMyselfFromSelection, setMyselfContactId]);

  useEffect(() => {
    setSelectionTotalCount(totalCount);
  }, [setSelectionTotalCount, totalCount]);

  useEffect(() => {
    setLoadedContactCount(contactIds.length);
  }, [contactIds.length, setLoadedContactCount]);

  useEffect(() => {
    const knownContactIds = new Set(contactIds);

    if (myselfContactId) {
      knownContactIds.add(myselfContactId);
    }

    pruneSelectionToKnownContactIds(knownContactIds);
  }, [contactIds, myselfContactId, pruneSelectionToKnownContactIds]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        exitSelectionMode();
      };
    }, [exitSelectionMode]),
  );
}
