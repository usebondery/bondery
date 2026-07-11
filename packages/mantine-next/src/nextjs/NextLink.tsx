import NextLink from "next/link.js";
import type { AnchorHTMLAttributes, ElementType, ReactNode } from "react";

export type NextLinkComponentProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children?: ReactNode;
  scroll?: boolean;
  prefetch?: boolean | null;
  replace?: boolean;
  locale?: string | false;
};

/** NodeNext resolves `next/link.js` as a module namespace; cast for JSX usage. */
const Link = NextLink as unknown as React.ComponentType<NextLinkComponentProps>;

/**
 * Mantine 9 polymorphic `component` + TypeScript 6 cannot reconcile Next.js Link;
 * keep the cast here so call sites stay typed.
 */
export const mantineLinkComponent = Link as ElementType<NextLinkComponentProps>;

export default Link;
