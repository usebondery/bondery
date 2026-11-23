"use client";

import { nprogress } from "@mantine/nprogress";
import { useEffect } from "react";

interface ImportProgressSnapshot {
  current: number;
  total: number;
}

interface ProgressRange {
  end: number;
  start: number;
}

interface UseImporterNavigationProgressOptions<TStep extends string> {
  importProgress: ImportProgressSnapshot | null;
  importRange?: ProgressRange;
  step: TStep;
  stepProgress: Record<TStep, number>;
}

const DEFAULT_IMPORT_RANGE: ProgressRange = {
  end: 98,
  start: 84,
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
      const interpolated = importRange.start + ratio * (importRange.end - importRange.start);
      nprogress.set(clamp(interpolated, 0, 100));
      return;
    }

    const stepValue = clamp(stepProgress[step] ?? 0, 0, 100);
    if (stepValue >= 100) {
      // The import finished but the dialog stays open, so hide the bar instead of pinning it.
      nprogress.complete();
      return;
    }
    nprogress.set(stepValue);
  }, [
    step,
    stepProgress,
    importProgress?.current,
    importProgress?.total,
    importRange.start,
    importRange.end,
    importProgress,
  ]);
}
