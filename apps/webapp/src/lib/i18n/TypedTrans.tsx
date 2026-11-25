"use client";

import type { NamespaceKey, TranslateFn } from "@bondery/translations";
import { Trans } from "next-i18next/client";
import type { ReactElement } from "react";
import { transT } from "@/lib/i18n/transT";

type TypedTransProps<
  Namespace extends NamespaceKey,
  Prefix extends string | undefined,
  Key extends Parameters<TranslateFn<Namespace, Prefix>>[0],
> = {
  t: TranslateFn<Namespace, Prefix>;
  i18nKey: Key;
  components?: Record<string, ReactElement>;
  values?: Record<string, unknown>;
};

/**
 * Namespace-scoped `<Trans>` wrapper that preserves typed translation keys from our hooks.
 */
export function TypedTrans<
  Namespace extends NamespaceKey,
  Prefix extends string | undefined,
  Key extends Parameters<TranslateFn<Namespace, Prefix>>[0],
>({ t, i18nKey, components, values }: TypedTransProps<Namespace, Prefix, Key>) {
  return <Trans components={components} i18nKey={i18nKey as never} t={transT(t)} values={values} />;
}
