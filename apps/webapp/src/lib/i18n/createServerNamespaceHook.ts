import "server-only";

import type { BranchPrefixFor, NamespaceKey, TranslateFn } from "@bondery/translations";
import { getT } from "next-i18next/server";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";

/**
 * Namespace-scoped server translation helper for metadata and RSC.
 */
export async function createServerNamespaceHook<
  Namespace extends NamespaceKey,
  const Prefix extends BranchPrefixFor<Namespace> | undefined = undefined,
>(namespace: Namespace, keyPrefix?: Prefix): Promise<TranslateFn<Namespace, Prefix>> {
  const { locale } = await resolveLocaleSettings();
  const { t } = await getT(namespace as Parameters<typeof getT>[0], {
    lng: locale,
    ...(keyPrefix ? { keyPrefix } : {}),
  });
  return t as TranslateFn<Namespace, Prefix>;
}
