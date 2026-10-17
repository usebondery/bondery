import type { ReactNode } from "react";
import { MOBILE_LAYOUT } from "../../theme/layout";
import { Heading } from "../ui/Heading";

interface TabRootLargeTitleProps {
  children: ReactNode;
}

/** Large tab-root screen title sized to fit the fixed title row slot. */
export function TabRootLargeTitle({ children }: TabRootLargeTitleProps) {
  return (
    <Heading
      className="self-start"
      numberOfLines={1}
      order={1}
      style={{ lineHeight: MOBILE_LAYOUT.screenChrome.titleRowHeight }}
    >
      {children}
    </Heading>
  );
}
