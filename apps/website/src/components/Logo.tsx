import { BonderyLogotypeBlack, BonderyLogotypeWhite } from "@bondery/branding/src";
import { Flex } from "@mantine/core";
import Link from "next/link";

type LogoProps = {
  /** Size of the logotype in pixels */
  size?: number;
  /** @deprecated Use size instead */
  iconSize?: number;
  /** @deprecated Not used anymore, text is part of logotype */
  textSize?: string;
  /** URL to link to (defaults to "/") */
  href?: string;
};

/**
 * Reusable Logo component displaying the Bondery white logotype
 */
export function Logo({ size, iconSize, href = "/" }: LogoProps) {
  const logoSize = size ?? iconSize ?? 120;

  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <Flex align="center" gap="xs" darkHidden>
        <BonderyLogotypeBlack width={logoSize * 3} height={logoSize} />
      </Flex>

      <Flex align="center" gap="xs" lightHidden>
        <BonderyLogotypeWhite width={logoSize * 3} height={logoSize} />
      </Flex>
    </Link>
  );
}
