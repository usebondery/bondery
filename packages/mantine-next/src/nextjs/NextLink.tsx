import NextLink from "next/link.js";
import type { ComponentType, ReactNode } from "react";

export type NextLinkComponentProps = {
  href: string;
  children?: ReactNode;
  target?: string;
  rel?: string;
  scroll?: boolean;
};

/** NodeNext resolves `next/link.js` as a module namespace; cast for JSX and Mantine `component` usage. */
const Link = NextLink as unknown as ComponentType<NextLinkComponentProps>;

export default Link;
