import { useState } from "react";
import type { FieldValues, UseFormHandleSubmit } from "react-hook-form";

type UseSheetLocalSubmitOptions<TFieldValues extends FieldValues, TResult> = {
  onClose: () => void;
  onError?: (error: unknown) => void;
  onSuccess?: (result: TResult) => void;
  /** Local-only work (sync DB, enqueue mutation). Must not await network sync. */
  perform: (values: TFieldValues) => TResult;
};

/**
 * Submit handler for offline-first sheet forms.
 * Busy on press, validates via RHF, runs local persistence synchronously,
 * then closes the sheet (`onClose`) before `onSuccess`.
 * For navigation after close, use `Sheet` `onDismissed` — not `onSuccess`.
 */
export function useSheetLocalSubmit<TFieldValues extends FieldValues, TResult>(
  handleSubmit: UseFormHandleSubmit<TFieldValues>,
  { perform, onClose, onSuccess, onError }: UseSheetLocalSubmitOptions<TFieldValues, TResult>,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  function submit() {
    setIsSubmitting(true);
    void handleSubmit((values) => {
      try {
        const result = perform(values);
        onClose();
        onSuccess?.(result);
      } catch (error) {
        onError?.(error);
      } finally {
        setIsSubmitting(false);
      }
    })()
      .catch(() => {
        // RHF validation failed — sheet stays open.
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return { isSubmitting, submit };
}
