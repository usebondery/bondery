import { BonderyLogotypeBlack, BonderyLogotypeWhite } from "@bondery/branding/react";
import { Flex } from "@mantine/core";
import Link from "next/link";

type LogoProps = {
  /** Accessible name for the home link (logotype is decorative). */
  ariaLabel?: string;
  /** `white` for the brand panel; `auto` follows the color scheme. */
  color?: "auto" | "white";
  /** URL to link to (defaults to "/") */
  href?: string;
  /** @deprecated Use size instead */
  iconSize?: number;
  /** Size of the logotype in pixels */
  size?: number;
  /** @deprecated Not used anymore, text is part of logotype */
  textSize?: string;
};

/**
 * Reusable Logo component displaying the Bondery logotype
 * Can be used throughout the application with consistent branding
 */
export function Logo({ ariaLabel, color = "auto", href = "/", iconSize, size }: LogoProps) {
  // Support legacy iconSize prop
  const logoSize = size ?? iconSize ?? 120;

  return (
    <Link aria-label={ariaLabel} href={href} style={{ color: "inherit", textDecoration: "none" }}>
      {color === "white" ? (
        <BonderyLogotypeWhite aria-hidden height={logoSize} width={logoSize * 3} />
      ) : (
        <>
          <Flex align="center" darkHidden gap="xs">
            <BonderyLogotypeBlack aria-hidden height={logoSize} width={logoSize * 3} />
          </Flex>
          <Flex align="center" gap="xs" lightHidden>
            <BonderyLogotypeWhite aria-hidden height={logoSize} width={logoSize * 3} />
          </Flex>
        </>
      )}
    </Link>
  );
}
