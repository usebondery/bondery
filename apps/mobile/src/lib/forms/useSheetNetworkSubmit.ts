import { useState } from "react";
import type { FieldValues, UseFormHandleSubmit } from "react-hook-form";

type UseSheetNetworkSubmitOptions<TFieldValues extends FieldValues, TResult> = {
  onClose: () => void;
  onError?: (error: unknown) => void;
  onSuccess?: (result: TResult) => void;
  /** Tier-2/online work. Await network; do not use for tier-1 sync domains. */
  perform: (values: TFieldValues) => Promise<TResult>;
};

/**
 * Sheet submit for network-backed actions (share email, etc.).
 * Same `{ isSubmitting, submit }` API; closes after successful `perform`.
 */
export function useSheetNetworkSubmit<TFieldValues extends FieldValues, TResult>(
  handleSubmit: UseFormHandleSubmit<TFieldValues>,
  { perform, onClose, onSuccess, onError }: UseSheetNetworkSubmitOptions<TFieldValues, TResult>,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  function submit() {
    setIsSubmitting(true);
    void handleSubmit(async (values) => {
      try {
        const result = await perform(values);
        onClose();
        onSuccess?.(result);
      } catch (error) {
        onError?.(error);
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
