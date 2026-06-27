import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { FlashListRef } from "@shopify/flash-list";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { UI_TIMING_MS } from "../../../lib/config";
import type { ContactsFlatRow } from "../contactsFlatList";
import {
  buildFlatRowOffsetIndex,
  collectSelectableContactIdsInRange,
  resolveContactAnchorIndexAtContentY,
  resolveFlatIndexAtContentY,
} from "../contactsDragSelection";
import { useContactsSelection } from "../contactsSelectionStore";

const EDGE_ZONE_RATIO = 0.15;
const AUTO_SCROLL_MIN_SPEED = 120;
const AUTO_SCROLL_MAX_SPEED = 360;

type DragBaseline = {
  isAllTotalSelected: boolean;
  selectedIds: Set<string>;
  excludedIds: Set<string>;
};

interface UseContactsDragSelectionOptions {
  enabled: boolean;
  flatRows: ContactsFlatRow[];
  myselfContactId: string | undefined;
  listHeaderHeight: number;
  listViewportHeight: number;
  flashListRef: RefObject<FlashListRef<ContactsFlatRow> | null>;
}

function getAutoScrollSpeed(localY: number, viewportHeight: number): number {
  if (viewportHeight <= 0) {
    return 0;
  }

  const topZoneEnd = viewportHeight * EDGE_ZONE_RATIO;
  const bottomZoneStart = viewportHeight * (1 - EDGE_ZONE_RATIO);

  if (localY < topZoneEnd) {
    const depth = 1 - localY / topZoneEnd;
    return -(
      AUTO_SCROLL_MIN_SPEED +
      (AUTO_SCROLL_MAX_SPEED - AUTO_SCROLL_MIN_SPEED) * depth ** 1.5
    );
  }

  if (localY > bottomZoneStart) {
    const depth =
      (localY - bottomZoneStart) / (viewportHeight - bottomZoneStart);
    return (
      AUTO_SCROLL_MIN_SPEED +
      (AUTO_SCROLL_MAX_SPEED - AUTO_SCROLL_MIN_SPEED) * depth ** 1.5
    );
  }

  return 0;
}

function cloneDragBaseline(
  state: ReturnType<typeof useContactsSelection.getState>,
): DragBaseline {
  return {
    isAllTotalSelected: state.isAllTotalSelected,
    selectedIds: new Set(state.selectedIds),
    excludedIds: new Set(state.excludedIds),
  };
}

export function useContactsDragSelection({
  enabled,
  flatRows,
  myselfContactId,
  listHeaderHeight,
  listViewportHeight,
  flashListRef,
}: UseContactsDragSelectionOptions) {
  const scrollOffsetRef = useRef(0);
  const animatedScrollOffsetRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const anchorIndexRef = useRef<number | null>(null);
  const selectInRangeRef = useRef(true);
  const baselineRef = useRef<DragBaseline | null>(null);
  const lastLocalYRef = useRef(0);
  const dragFrameRef = useRef<number | null>(null);
  const dragFrameLastTimestampRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastSyncedRangeKeyRef = useRef("");

  const syncDragSelectionRange = useContactsSelection(
    (state) => state.syncDragSelectionRange,
  );

  const layoutIndex = useMemo(
    () => buildFlatRowOffsetIndex(flatRows),
    [flatRows],
  );

  const maxScrollOffset = useMemo(() => {
    if (layoutIndex.length === 0) {
      return 0;
    }

    const lastEntry = layoutIndex[layoutIndex.length - 1];
    const contentHeight =
      listHeaderHeight + lastEntry.offsetY + lastEntry.height;

    return Math.max(0, contentHeight - listViewportHeight);
  }, [layoutIndex, listHeaderHeight, listViewportHeight]);

  const resolveRowContentY = useCallback(
    (localY: number) => {
      const contentY = scrollOffsetRef.current + localY;

      if (contentY < listHeaderHeight) {
        return null;
      }

      return contentY - listHeaderHeight;
    },
    [listHeaderHeight],
  );

  const syncRangeAtLocalY = useCallback(
    (localY: number) => {
      const anchorIndex = anchorIndexRef.current;
      const baseline = baselineRef.current;

      if (anchorIndex === null || baseline === null) {
        return;
      }

      const rowContentY = resolveRowContentY(localY);

      if (rowContentY === null) {
        return;
      }

      const currentIndex = resolveFlatIndexAtContentY(rowContentY, layoutIndex);

      if (currentIndex === null) {
        return;
      }

      const rangeKey = `${anchorIndex}:${currentIndex}:${selectInRangeRef.current}`;

      if (rangeKey === lastSyncedRangeKeyRef.current) {
        return;
      }

      lastSyncedRangeKeyRef.current = rangeKey;

      const rangeContactIds = collectSelectableContactIdsInRange(
        layoutIndex,
        anchorIndex,
        currentIndex,
        myselfContactId,
      );

      syncDragSelectionRange({
        rangeContactIds,
        selectInRange: selectInRangeRef.current,
        baseline,
      });
    },
    [layoutIndex, myselfContactId, resolveRowContentY, syncDragSelectionRange],
  );

  const applyScrollOffset = useCallback(
    (nextOffset: number) => {
      if (nextOffset === animatedScrollOffsetRef.current) {
        return;
      }

      animatedScrollOffsetRef.current = nextOffset;
      scrollOffsetRef.current = nextOffset;
      flashListRef.current?.scrollToOffset({
        offset: nextOffset,
        animated: false,
      });
    },
    [flashListRef],
  );

  const stopDragFrameLoop = useCallback(() => {
    if (dragFrameRef.current !== null) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }

    dragFrameLastTimestampRef.current = 0;
  }, []);

  const runDragFrame = useCallback(
    (timestamp: number) => {
      if (!isDraggingRef.current) {
        stopDragFrameLoop();
        return;
      }

      const previousTimestamp = dragFrameLastTimestampRef.current || timestamp;
      const deltaSeconds = Math.min(
        0.05,
        Math.max(0, (timestamp - previousTimestamp) / 1000),
      );
      dragFrameLastTimestampRef.current = timestamp;

      const speed = getAutoScrollSpeed(
        lastLocalYRef.current,
        listViewportHeight,
      );

      if (speed !== 0 && maxScrollOffset > 0) {
        const nextOffset = Math.min(
          maxScrollOffset,
          Math.max(0, animatedScrollOffsetRef.current + speed * deltaSeconds),
        );
        applyScrollOffset(nextOffset);
      }

      syncRangeAtLocalY(lastLocalYRef.current);
      dragFrameRef.current = requestAnimationFrame(runDragFrame);
    },
    [
      applyScrollOffset,
      listViewportHeight,
      maxScrollOffset,
      stopDragFrameLoop,
      syncRangeAtLocalY,
    ],
  );

  const startDragFrameLoop = useCallback(() => {
    if (dragFrameRef.current !== null) {
      return;
    }

    dragFrameLastTimestampRef.current = 0;
    dragFrameRef.current = requestAnimationFrame(runDragFrame);
  }, [runDragFrame]);

  const handleDragStart = useCallback(
    (localY: number) => {
      const rowContentY = resolveRowContentY(localY);

      if (rowContentY === null) {
        return;
      }

      const anchorIndex = resolveContactAnchorIndexAtContentY(
        rowContentY,
        layoutIndex,
        myselfContactId,
      );

      if (anchorIndex === null) {
        return;
      }

      const anchorRow = layoutIndex[anchorIndex]?.row;

      if (!anchorRow || anchorRow.type !== "contact") {
        return;
      }

      const selectionState = useContactsSelection.getState();
      const isAnchorSelected = selectionState.isSelected(anchorRow.contact.id);

      anchorIndexRef.current = anchorIndex;
      selectInRangeRef.current = !isAnchorSelected;
      baselineRef.current = cloneDragBaseline(selectionState);
      lastSyncedRangeKeyRef.current = "";
      lastLocalYRef.current = localY;
      animatedScrollOffsetRef.current = scrollOffsetRef.current;
      isDraggingRef.current = true;
      setIsDragging(true);
      syncRangeAtLocalY(localY);
      startDragFrameLoop();
    },
    [
      layoutIndex,
      myselfContactId,
      resolveRowContentY,
      startDragFrameLoop,
      syncRangeAtLocalY,
    ],
  );

  const handleDragMove = useCallback((localY: number) => {
    lastLocalYRef.current = localY;
  }, []);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    anchorIndexRef.current = null;
    baselineRef.current = null;
    lastSyncedRangeKeyRef.current = "";
    stopDragFrameLoop();
    setIsDragging(false);
  }, [stopDragFrameLoop]);

  useEffect(() => {
    return () => {
      stopDragFrameLoop();
    };
  }, [stopDragFrameLoop]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activateAfterLongPress(UI_TIMING_MS.selectionDragArmDelay)
        .onStart((event) => {
          runOnJS(handleDragStart)(event.y);
        })
        .onUpdate((event) => {
          runOnJS(handleDragMove)(event.y);
        })
        .onFinalize(() => {
          runOnJS(handleDragEnd)();
        }),
    [enabled, handleDragEnd, handleDragMove, handleDragStart],
  );

  const onScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (!isDraggingRef.current) {
        scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        animatedScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
      }
    },
    [],
  );

  return {
    gesture,
    isDragging,
    onScroll,
  };
}
