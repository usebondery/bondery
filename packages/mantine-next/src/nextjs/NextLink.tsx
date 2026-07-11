import NextLink from "next/link.js";
import type { AnchorHTMLAttributes, ReactNode } from "react";

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

export default Link;
