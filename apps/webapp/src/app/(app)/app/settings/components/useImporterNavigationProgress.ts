"use client";

import { useEffect } from "react";
import { nprogress } from "@mantine/nprogress";

interface ImportProgressSnapshot {
  current: number;
  total: number;
}

interface ProgressRange {
  start: number;
  end: number;
}

interface UseImporterNavigationProgressOptions<TStep extends string> {
  step: TStep;
  stepProgress: Record<TStep, number>;
  importProgress: ImportProgressSnapshot | null;
  importRange?: ProgressRange;
}

const DEFAULT_IMPORT_RANGE: ProgressRange = {
  start: 84,
  end: 98,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Keeps Mantine top navigation progress in sync with importer modal state.
 * Mirrors onboarding behavior by setting progress for each step and
 * interpolating within a narrow range while import batches are running.
 */
export function useImporterNavigationProgress<TStep extends string>({
  step,
  stepProgress,
  importProgress,
  importRange = DEFAULT_IMPORT_RANGE,
}: UseImporterNavigationProgressOptions<TStep>): void {
  useEffect(() => {
    if (importProgress && importProgress.total > 0) {
      const ratio = clamp(importProgress.current / importProgress.total, 0, 1);
      const interpolated =
        importRange.start + ratio * (importRange.end - importRange.start);
      nprogress.set(clamp(interpolated, 0, 100));
      return;
    }

    nprogress.set(clamp(stepProgress[step] ?? 0, 0, 100));
  }, [
    step,
    stepProgress,
    importProgress?.current,
    importProgress?.total,
    importRange.start,
    importRange.end,
  ]);
}
