import { useMemo, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { FAB_GESTURE } from "../../lib/config";
import { useFabSpeedDial } from "./fabSpeedDialContext";
import { resolveFabHighlightedActionId } from "./fabSpeedDialHitTest";

interface UseFabPlusGestureOptions {
  measurePlusBubble: () => void;
  getPlusCancelY: () => number | null;
}

type PanSession = {
  isDragMode: boolean;
  wasOpenAtPanStart: boolean;
  openedDuringPan: boolean;
};

/**
 * Pan-only gesture for FAB drag-select. Tap and long-press live on the wrapped Tappable
 * (`Gesture.Native()` runs simultaneously so squeeze feedback still works).
 */
export function useFabPlusGesture({ measurePlusBubble, getPlusCancelY }: UseFabPlusGestureOptions) {
  const {
    isOpen,
    getMenuItemLayouts,
    openMenu,
    closeMenu,
    runAction,
    setHighlightedActionId,
    usesInlineMenu,
  } = useFabSpeedDial();

  const sessionRef = useRef<PanSession>({
    isDragMode: false,
    wasOpenAtPanStart: false,
    openedDuringPan: false,
  });

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const getPlusCancelYRef = useRef(getPlusCancelY);
  getPlusCancelYRef.current = getPlusCancelY;

  const gesture = useMemo(() => {
    const resetSession = () => {
      sessionRef.current = {
        isDragMode: false,
        wasOpenAtPanStart: false,
        openedDuringPan: false,
      };
    };

    const handlePanBegin = () => {
      sessionRef.current = {
        isDragMode: false,
        wasOpenAtPanStart: isOpenRef.current,
        openedDuringPan: false,
      };
      measurePlusBubble();
    };

    const handlePanUpdate = (absoluteX: number, absoluteY: number, translationY: number) => {
      const distance = Math.abs(translationY);

      if (!sessionRef.current.isDragMode && distance >= FAB_GESTURE.dragThresholdPx) {
        sessionRef.current.isDragMode = true;

        if (!isOpenRef.current && usesInlineMenu) {
          sessionRef.current.openedDuringPan = true;
          openMenu();
        }
      }

      if (!sessionRef.current.isDragMode || !isOpenRef.current) {
        return;
      }

      const cancelY = getPlusCancelYRef.current();
      if (cancelY !== null && absoluteY > cancelY) {
        setHighlightedActionId(null);
        return;
      }

      const highlightedId = resolveFabHighlightedActionId(
        getMenuItemLayouts(),
        absoluteX,
        absoluteY,
      );
      setHighlightedActionId(highlightedId);
    };

    const handlePanFinalize = (absoluteX: number, absoluteY: number) => {
      const session = sessionRef.current;

      if (session.isDragMode && isOpenRef.current) {
        const highlightedId = resolveFabHighlightedActionId(
          getMenuItemLayouts(),
          absoluteX,
          absoluteY,
        );

        if (highlightedId) {
          runAction(highlightedId);
        } else if (session.wasOpenAtPanStart || session.openedDuringPan) {
          closeMenu();
        }
      }

      setHighlightedActionId(null);
      resetSession();
    };

    const panGesture = Gesture.Pan()
      .minDistance(FAB_GESTURE.dragThresholdPx)
      .onBegin(() => {
        runOnJS(handlePanBegin)();
      })
      .onUpdate((event) => {
        runOnJS(handlePanUpdate)(event.absoluteX, event.absoluteY, event.translationY);
      })
      .onFinalize((event) => {
        runOnJS(handlePanFinalize)(event.absoluteX, event.absoluteY);
      });

    return Gesture.Simultaneous(panGesture, Gesture.Native());
  }, [
    closeMenu,
    getMenuItemLayouts,
    measurePlusBubble,
    openMenu,
    runAction,
    setHighlightedActionId,
    usesInlineMenu,
  ]);

  return gesture;
}
