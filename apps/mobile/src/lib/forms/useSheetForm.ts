import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import type { DefaultValues, FieldValues, UseFormProps, UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { z } from "zod";

type FormInput<TSchema extends z.ZodTypeAny> =
  z.input<TSchema> extends FieldValues ? z.input<TSchema> : FieldValues;
type FormOutput<TSchema extends z.ZodTypeAny> = z.output<TSchema>;
type FormContext = Record<string, never>;

interface UseSheetFormOptions<TSchema extends z.ZodTypeAny> {
  getDefaultValues: () => DefaultValues<FormInput<TSchema>>;
  mode?: UseFormProps<FormInput<TSchema>>["mode"];
  open: boolean;
  schema: TSchema;
}

/**
 * React Hook Form wrapper for ActionSheetPopup forms.
 * Resets fields only when the sheet is opened, preventing in-flight typing from
 * being overwritten by parent prop updates while the sheet remains visible.
 */
export function useSheetForm<TSchema extends z.ZodTypeAny>({
  open,
  schema,
  getDefaultValues,
  mode = "onTouched",
}: UseSheetFormOptions<TSchema>): UseFormReturn<
  FormInput<TSchema>,
  FormContext,
  FormOutput<TSchema>
> {
  const wasOpenRef = useRef(false);
  const getDefaultValuesRef = useRef(getDefaultValues);
  getDefaultValuesRef.current = getDefaultValues;

  const form = useForm<FormInput<TSchema>, FormContext, FormOutput<TSchema>>({
    defaultValues: getDefaultValues(),
    mode,
    // zodResolver does not preserve transformed output generics cleanly in RHF v7 + zod v4 typings.
    // Runtime behavior is correct; keep the stronger public useSheetForm types above.
    // @ts-expect-error resolver generic mismatch between RHF and zod typings
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    if (wasOpenRef.current) {
      return;
    }

    wasOpenRef.current = true;
    form.reset(getDefaultValuesRef.current());
  }, [open, form]);

  return form;
}
