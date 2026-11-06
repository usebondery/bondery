import { Title } from "@mantine/core";
import type { ReactNode } from "react";
import { DocsHeadingLink } from "./DocsHeadingLink";

type DocsHeadingProps = {
  children: ReactNode;
  id?: string;
  order: 2 | 3 | 4;
};

/**
 * Heading with a hash link. The link stays hidden until hover or keyboard focus.
 *
 * The anchor sits inside the heading rather than beside it in a wrapper. That keeps
 * the heading a direct child of the prose container, so the prose rhythm rules can
 * space it and `Typography`'s own margins collapse as normal.
 */
export function DocsHeading({ children, id, order }: DocsHeadingProps) {
  return (
    <Title className="docsHeading" id={id} order={order} style={{ scrollMarginTop: 120 }}>
      {children}
      {id ? <DocsHeadingLink id={id} /> : null}
    </Title>
  );
}
