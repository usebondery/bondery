/**
 * Accepts i18next `t` without importing `@bondery/translations` (that package has no
 * `prepare`, so helpers cannot typecheck against it during `pnpm install`).
 * Rest `any` keeps overloaded `TFunction` assignable at call sites.
 */
// biome-ignore lint/suspicious/noExplicitAny: i18next TFunction overloads
export type ApiErrorTranslateFn = (...args: any[]) => string;
