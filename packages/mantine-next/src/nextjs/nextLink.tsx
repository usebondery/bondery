import type { Route } from "next";
import NextLink from "next/link.js";
import type { AnchorHTMLAttributes, ReactNode } from "react";

/** In-app `Route`, `URL`, hash targets, or common external schemes for link components. */
type AppHref =
  | Route
  | URL
  | `#${string}`
  | `/#${string}`
  | `http://${string}`
  | `https://${string}`
  | `mailto:${string}`
  | `tel:${string}`;

type NextLinkComponentProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: AppHref;
  children?: ReactNode;
  scroll?: boolean;
  prefetch?: boolean | null;
  replace?: boolean;
  locale?: string | false;
};

/** NodeNext resolves `next/link.js` as a module namespace; cast for JSX usage. */
const Link = NextLink as unknown as React.ComponentType<NextLinkComponentProps>;

export type { AppHref, NextLinkComponentProps };

/** Widens a runtime URL string for {@link AppHref} (external or validated in-app). */
export function hrefAssert(href: string): AppHref {
  return href as AppHref;
}

export default Link;
