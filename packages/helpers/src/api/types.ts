/** Translate function scoped to `common` for API/validation error messages. */
export type ApiErrorTranslateFn = (
  key: string,
  options?: { defaultValue?: string } & Record<string, unknown>,
) => string;
