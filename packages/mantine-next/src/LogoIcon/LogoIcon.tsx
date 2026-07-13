import { BonderyIcon } from "@bondery/branding";
import type { SVGProps } from "react";

export interface LogoIconProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height"> {
  size?: number | string;
}

export function LogoIcon({ size = 24, ...props }: LogoIconProps) {
  return <BonderyIcon height={size} width={size} {...props} />;
}
