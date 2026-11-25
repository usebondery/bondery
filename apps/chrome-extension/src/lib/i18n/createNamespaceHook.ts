import type { BranchPrefixFor, NamespaceKey, TranslateFn } from "@bondery/translations";
import { useTranslation } from "react-i18next";

/**
 * Namespace-scoped client translation hook for the chrome extension popup.
 */
export function createNamespaceHook<
  Namespace extends NamespaceKey,
  const Prefix extends BranchPrefixFor<Namespace> | undefined = undefined,
>(namespace: Namespace, keyPrefix?: Prefix): TranslateFn<Namespace, Prefix> {
  // biome-ignore lint/correctness/useHookAtTopLevel: factory returns a custom hook
  const { t } = useTranslation(
    namespace as Parameters<typeof useTranslation>[0],
    keyPrefix ? { keyPrefix } : undefined,
  );
  return t as TranslateFn<Namespace, Prefix>;
}
