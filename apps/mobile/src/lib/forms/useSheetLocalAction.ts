import { useState } from "react";

type UseSheetLocalActionOptions<TResult> = {
  onClose: () => void;
  onError?: (error: unknown) => void;
  onSuccess?: (result: TResult) => void;
  /** Local-only work (sync DB, enqueue mutation). Must not await network sync. */
  perform: () => TResult;
};

/**
 * Busy/submit lifecycle for sheets without RHF (multi-select, confirm delete).
 * Same close order as `useSheetLocalSubmit`: perform → onClose → onSuccess.
 */
export function useSheetLocalAction<TResult = void>({
  perform,
  onClose,
  onSuccess,
  onError,
}: UseSheetLocalActionOptions<TResult>) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  function submit() {
    setIsSubmitting(true);
    try {
      const result = perform();
      onClose();
      onSuccess?.(result);
    } catch (error) {
      onError?.(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, submit };
}
