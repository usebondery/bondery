import type { NamespaceKey, TranslateFn } from "@bondery/translations";
import type { TFunction } from "i18next";

/** Cast a namespace-scoped hook `t` for next-i18next `<Trans t={...} />` props. */
export function transT<NS extends NamespaceKey, Prefix extends string | undefined>(
  t: TranslateFn<NS, Prefix>,
): TFunction {
  return t as TFunction;
}
