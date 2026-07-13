import type { TFunction } from "i18next";
import type { NamespacePrefixes } from "./generated/i18n/catalog-prefixes.js";
import type { Catalog } from "./generated/i18n/catalog-types.js";

export type * from "./generated/i18n/catalog-prefixes.js";
export type { NamespacePrefixes } from "./generated/i18n/catalog-prefixes.js";
export type { Catalog } from "./generated/i18n/catalog-types.js";

/** Manifest namespace name. */
export type NamespaceKey = keyof Catalog;

export type WebNamespace = import("./generated/i18n/namespaces.js").WebNamespace;
export type MobileNamespace = import("./generated/i18n/namespaces.js").MobileNamespace;
export type ExtensionNamespace = import("./generated/i18n/namespaces.js").ExtensionNamespace;

/** Dot-joined nested key paths for a namespace JSON tree. */
type JoinKeys<Prefix extends string, Key extends string> = Prefix extends ""
  ? Key
  : `${Prefix}.${Key}`;

type DecrementDepth = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type NestedKeyPaths<T, Prefix extends string = "", Depth extends number = 8> = Depth extends never
  ? Prefix
  : T extends string
    ? Prefix
    : T extends object
      ? {
          [K in keyof T & string]: NestedKeyPaths<T[K], JoinKeys<Prefix, K>, DecrementDepth[Depth]>;
        }[keyof T & string]
      : Prefix;

/** Resolve a dotted prefix path into the subtree type at that branch. */
type ResolveSubtree<T, P extends string> = P extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? T[Head] extends object
      ? ResolveSubtree<T[Head], Tail>
      : never
    : never
  : P extends keyof T
    ? T[P]
    : never;

type SubtreeAtPrefix<T, Prefix extends string | undefined> = Prefix extends string
  ? ResolveSubtree<T, Prefix> extends infer Subtree
    ? Subtree extends object
      ? Subtree
      : never
    : never
  : T;

/** Translation keys available under an optional keyPrefix within a namespace. */
export type PrefixedKeys<
  NS extends NamespaceKey,
  Prefix extends string | undefined = undefined,
> = NestedKeyPaths<SubtreeAtPrefix<Catalog[NS], Prefix>>;

/** Valid keyPrefix values for a namespace (object branch paths in the JSON tree). */
export type BranchPrefixFor<NS extends NamespaceKey> = NamespacePrefixes[NS];

/** Bivariant translate fn for utilities that accept dynamic or cross-section keys. */
export type LooseTranslateFn = (key: string, options?: Record<string, unknown>) => string;

/** Namespace-scoped translate function with optional prefix narrowing. */
export type TranslateFn<
  NS extends NamespaceKey,
  Prefix extends string | undefined = undefined,
> = TFunction<NS, Prefix extends string ? Prefix : undefined>;
