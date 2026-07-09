"use client";

import { useEffect } from "react";

import { getState, subscribe } from "@/lib/extension/enrichBatchStore";

import { getQueryClient } from "./client";

import { invalidateAfterEnrichBatch } from "./invalidation";

/**
 * Subscribes to enrich batch store transitions and invalidates TanStack Query
 * caches when a batch run finishes with at least one successful enrichment.
 */

export function useEnrichBatchInvalidation() {
  useEffect(() => {
    let wasRunning = getState().isRunning;

    return subscribe(() => {
      const state = getState();

      const isRunning = state.isRunning;

      if (wasRunning && !isRunning && state.completed > 0) {
        void invalidateAfterEnrichBatch(getQueryClient());
      }

      wasRunning = isRunning;
    });
  }, []);
}
