import { Card } from "@mantine/core";
import type { ReactNode } from "react";
import Link, { hrefAssert } from "#nextjs/NextLink.js";

export interface PressableCardProps {
  children: ReactNode;
  /** Open the href in a new tab. `http` and `https` hrefs do this too. */
  external?: boolean;
  /** Share a row with another card. The card grows to the same height. */
  grow?: boolean;
  href: string;
}

function isExternalHref(href: string, external: boolean): boolean {
  return external || href.startsWith("http://") || href.startsWith("https://");
}

/**
 * A card whose whole surface is one link.
 */
export function PressableCard({
  children,
  external = false,
  grow = false,
  href,
}: PressableCardProps) {
  const className = grow
    ? "pressableCard pressableCardGrow button-scale-effect"
    : "pressableCard button-scale-effect";
  const surface = (
    <Card className="pressableCardSurface" h="100%" padding="md" withBorder>
      {children}
    </Card>
  );

  if (isExternalHref(href, external)) {
    return (
      <a className={className} href={href} rel="noopener noreferrer" target="_blank">
        {surface}
      </a>
    );
  }

  return (
    <Link className={className} href={hrefAssert(href)}>
      {surface}
    </Link>
  );
}
