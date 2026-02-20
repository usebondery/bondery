import { BonderyIcon } from "@bondery/branding";
import type { SVGProps } from "react";

export interface LogoIconProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height"> {
  size?: number | string;
}

export function LogoIcon({ size = 24, ...props }: LogoIconProps) {
  return <BonderyIcon width={size} height={size} {...props} />;
}
