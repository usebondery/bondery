type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
/**
 * Compile-time type equality helpers for *.contract.ts modules.
 * Not exported from public barrels.
 */
export type Assert<T extends true> = T;

export type IsEqual<A, B> =
  Equal<A, B> extends true ? (Equal<B, A> extends true ? true : false) : false;
