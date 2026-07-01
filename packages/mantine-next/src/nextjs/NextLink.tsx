import type { ComponentType, ReactNode } from "react";
import NextLink from "next/link.js";

export type NextLinkComponentProps = {
  href: string;
  children?: ReactNode;
  target?: string;
  rel?: string;
};

/** NodeNext resolves `next/link.js` as a module namespace; cast for JSX and Mantine `component` usage. */
const Link = NextLink as unknown as ComponentType<NextLinkComponentProps>;

export default Link;
