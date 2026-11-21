import { BonderyLogotypeBlack, BonderyLogotypeWhite } from "@bondery/branding/react";
import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import { Flex } from "@mantine/core";
import type { Route } from "next";
import Link from "next/link";

/** The logotype (icon plus wordmark) is this many times wider than it is tall. */
const LOGOTYPE_ASPECT_RATIO = 3;

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
      aria-label={landing.Logo.HomepageAriaLabel}
      href={homeHref}
      style={{ color: "inherit", textDecoration: "none" }}
    >
      <Flex align="center" darkHidden gap="xs">
        <BonderyLogotypeBlack height={logoSize} width={logoSize * LOGOTYPE_ASPECT_RATIO} />
      </Flex>

      <Flex align="center" gap="xs" lightHidden>
        <BonderyLogotypeWhite height={logoSize} width={logoSize * LOGOTYPE_ASPECT_RATIO} />
      </Flex>
    </Link>
  );
}
