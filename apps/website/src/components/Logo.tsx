import { BonderyLogotypeBlack, BonderyLogotypeWhite } from "@bondery/branding/react";
import { Flex } from "@mantine/core";
import type { Route } from "next";
import Link from "next/link";

type LogoProps = {
  /** Size of the logotype in pixels */
  size?: number;
  /** @deprecated Use size instead */
  iconSize?: number;
  /** @deprecated Not used anymore, text is part of logotype */
  textSize?: string;
  /** URL to link to (defaults to "/") */
  href?: Route;
};

/**
 * Reusable Logo component displaying the Bondery white logotype
 */
export function Logo({ size, iconSize, href = "/" }: LogoProps) {
  const homeHref: Route = href;
  const logoSize = size ?? iconSize ?? 120;

  return (
    <Link
      aria-label="Bondery homepage"
      href={homeHref}
      style={{ color: "inherit", textDecoration: "none" }}
    >
      <Flex align="center" darkHidden gap="xs">
        <BonderyLogotypeBlack height={logoSize} width={logoSize * 3} />
      </Flex>

      <Flex align="center" gap="xs" lightHidden>
        <BonderyLogotypeWhite height={logoSize} width={logoSize * 3} />
      </Flex>
    </Link>
  );
}
