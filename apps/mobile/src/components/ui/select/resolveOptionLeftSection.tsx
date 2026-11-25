import type { ReactNode } from "react";
import { isSelectLeftSectionConfig } from "./selectLeftSectionConfig";
import { SelectLeftSectionView } from "./selectLeftSectionView";
import type { SelectDataItem } from "./types";

export { isSelectLeftSectionConfig } from "./selectLeftSectionConfig";

export function resolveOptionLeftSection<TValue extends string>(
  option: SelectDataItem<TValue>,
): ReactNode {
  if (option.icon) {
    return option.icon;
  }

  if (!option.leftSection) {
    return null;
  }

  if (isSelectLeftSectionConfig(option.leftSection)) {
    return <SelectLeftSectionView section={option.leftSection} />;
  }

  return option.leftSection;
}
