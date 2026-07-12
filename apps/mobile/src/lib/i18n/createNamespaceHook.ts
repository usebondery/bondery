import type { BranchPrefixFor, NamespaceKey, TranslateFn } from "@bondery/translations";
import { useTranslation } from "react-i18next";

/**
 * Namespace-scoped client translation hook for React Native.
 */
export function createNamespaceHook<
  NS extends NamespaceKey,
  const Prefix extends BranchPrefixFor<NS> | undefined = undefined,
>(namespace: NS, keyPrefix?: Prefix): TranslateFn<NS, Prefix> {
  // biome-ignore lint/correctness/useHookAtTopLevel: factory returns a custom hook
  const { t } = useTranslation(
    namespace as Parameters<typeof useTranslation>[0],
    keyPrefix ? { keyPrefix } : undefined,
  );
  return t as TranslateFn<NS, Prefix>;
}
