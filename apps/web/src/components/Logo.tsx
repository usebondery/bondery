import { BonderyLogotypeWhite } from "@bondery/branding";
import { Flex } from "@mantine/core";
import Link from "next/link";

type LogoProps = {
  /** Size of the logotype in pixels */
  size?: number;
  /** URL to link to (defaults to "/") */
  href?: string;
};

/**
 * Reusable Logo component displaying the Bondery white logotype
 * Can be used throughout the application with consistent branding
 */
export function Logo({ size = 120, href = "/" }: LogoProps) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <Flex align="center" gap="xs">
        <BonderyLogotypeWhite width={size} height={size * 0.3} />
      </Flex>
    </Link>
  );
}
