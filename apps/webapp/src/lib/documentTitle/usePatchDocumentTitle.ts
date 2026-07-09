"use client";

import { useLayoutEffect, useRef } from "react";
import { useDocumentTitleContext } from "./DocumentTitleProvider";

/**
 * Patches the tab title when the displayed entity name changes after load (e.g. rename).
 * Skips the first resolved name so generateMetadata / coordinator remain authoritative on navigation.
 */
export function usePatchDocumentTitle(pageTitle: string | undefined): void {
  const { setEntityTitle } = useDocumentTitleContext();
  const baselineRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const trimmed = pageTitle?.trim();
    if (!trimmed) {
      return;
    }

    if (baselineRef.current === null) {
      baselineRef.current = trimmed;
      return;
    }

    if (baselineRef.current !== trimmed) {
      baselineRef.current = trimmed;
      setEntityTitle(trimmed);
    }
  }, [pageTitle, setEntityTitle]);
}
