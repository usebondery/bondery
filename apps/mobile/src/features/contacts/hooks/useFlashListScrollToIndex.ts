import type { FlashListRef } from "@shopify/flash-list";
import { type RefObject, useCallback, useRef } from "react";
import { LIST_SCROLL, UI_TIMING_MS } from "../../../lib/config";
import type { ContactsFlatRow } from "../contactsFlatList";

export function useFlashListScrollToIndex(
  flashListRef: RefObject<FlashListRef<ContactsFlatRow> | null>,
) {
  const pendingScrollIndexRef = useRef<number | null>(null);
  const scrollRetryCountRef = useRef(0);

  const scrollToFlatIndex = useCallback(
    (index: number) => {
      pendingScrollIndexRef.current = index;
      scrollRetryCountRef.current = 0;

      const attemptScroll = () => {
        void flashListRef.current
          ?.scrollToIndex({
            animated: false,
            index,
            viewOffset: 0,
          })
          .catch(() => {
            if (
              pendingScrollIndexRef.current !== index ||
              scrollRetryCountRef.current >= LIST_SCROLL.maxRetries
            ) {
              return;
            }

            scrollRetryCountRef.current += 1;
            setTimeout(attemptScroll, UI_TIMING_MS.scrollRetryDelay);
          });
      };

      attemptScroll();
    },
    [flashListRef],
  );

  return scrollToFlatIndex;
}
