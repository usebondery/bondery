import type { BranchPrefixFor, NamespaceKey, TranslateFn } from "@bondery/translations";
import { useT } from "next-i18next/client";

/**
 * Namespace-scoped client translation hook. Namespace is a literal so TypeScript
 * resolves keys only within that namespace catalog.
 */
export function createNamespaceHook<
  Namespace extends NamespaceKey,
  const Prefix extends BranchPrefixFor<Namespace> | undefined = undefined,
>(namespace: Namespace, keyPrefix?: Prefix): TranslateFn<Namespace, Prefix> {
  // biome-ignore lint/correctness/useHookAtTopLevel: factory returns a custom hook
  const { t } = useT(
    namespace as Parameters<typeof useT>[0],
    keyPrefix ? { keyPrefix } : undefined,
  );
  return t as TranslateFn<Namespace, Prefix>;
}
