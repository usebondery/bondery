import { BonderyIcon } from "@bondery/branding";
import type { ReactElement, SVGProps } from "react";

export interface LogoIconProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height"> {
  size?: number | string;
}

export function LogoIcon({ size = 24, ...props }: LogoIconProps): ReactElement {
  return <BonderyIcon height={size} width={size} {...props} />;
}
