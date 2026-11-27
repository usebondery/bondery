"use client";

import type { BrandMarkName } from "@bondery/branding";
import { Tabs } from "@mantine/core";
import { useOs } from "@mantine/hooks";
import { type ReactElement, type ReactNode, useState } from "react";
import { BrandMark } from "#BrandMark/index.js";
import {
  type PlatformTabOsDefaults,
  resolvePlatformTab,
} from "#PlatformTabs/resolvePlatformTab.js";

interface PlatformTabItem {
  /** Panel content. Only the open panel is in the DOM. */
  content: ReactNode;
  /** Icon shown when there is no `mark`. */
  icon?: ReactNode;
  label: string;
  /** Brand mark shown left of the label. Wins over `icon`. */
  mark?: BrandMarkName;
  value: string;
}

interface PlatformTabsProps {
  /** Tab value to open first. Outranks `osDefault`. */
  defaultValue?: string;
  items: PlatformTabItem[];
  onChange?: (value: string) => void;
  /** Maps a detected OS to the tab it should open. Applied after mount. */
  osDefault?: PlatformTabOsDefaults;
  /** Controlled tab value. */
  value?: string;
}

function TabMark({ item }: { item: PlatformTabItem }): ReactNode {
  if (item.mark) {
    return <BrandMark name={item.mark} />;
  }

  return item.icon ?? null;
}

/**
 * Tabs for per-platform instructions. Each tab shows a brand mark left of its label.
 * On a narrow screen the tab list scrolls sideways and labels stay on one line.
 *
 * With no `value` and no `defaultValue`, the first open tab follows `osDefault`. The
 * OS is known only after mount, so the first paint shows the first tab and the tab
 * for the reader's OS opens right after, as `CodeBlock` does.
 */
function PlatformTabs({
  defaultValue,
  items,
  onChange,
  osDefault,
  value,
}: PlatformTabsProps): ReactElement {
  const os = useOs();
  const [pickedValue, setPickedValue] = useState<string | null>(null);

  const activeValue = resolvePlatformTab({
    defaultValue,
    itemValues: items.map((item) => item.value),
    os,
    osDefault,
    pickedValue: value ?? pickedValue,
  });

  function handleChange(next: string | null) {
    if (next === null) {
      return;
    }
    setPickedValue(next);
    onChange?.(next);
  }

  return (
    <Tabs
      classNames={{ list: "platformTabsList", tab: "platformTabsTab" }}
      keepMounted={false}
      onChange={handleChange}
      value={activeValue}
    >
      <Tabs.List>
        {items.map((item) => (
          <Tabs.Tab key={item.value} leftSection={<TabMark item={item} />} value={item.value}>
            {item.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {items.map((item) => (
        <Tabs.Panel key={item.value} pt="md" value={item.value}>
          {item.content}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

export { type PlatformTabItem, PlatformTabs, type PlatformTabsProps };
