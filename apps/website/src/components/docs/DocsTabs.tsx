"use client";

import { Group, Select } from "@mantine/core";
import { type Icon, IconBook, IconCode, IconServer, IconTool } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { getTabForUrl } from "@/lib/docs-nav";
import { routeAssert } from "@/lib/navigation/route/assert";

export type DocsTabIcon = "book" | "server" | "code" | "tool";

export type DocsTab = {
  icon: DocsTabIcon;
  key: string;
  title: string;
  url: string;
};

const TAB_ICONS: Record<DocsTabIcon, Icon> = {
  book: IconBook,
  code: IconCode,
  server: IconServer,
  tool: IconTool,
};

type DocsTabsProps = {
  pathname: string;
  tabs: DocsTab[];
};

function isTabKeyActive(tabKey: string, pathname: string): boolean {
  const active = getTabForUrl(pathname);
  if (tabKey === active) {
    return true;
  }
  return active === "selfhost" && tabKey === "self-host";
}

function tabIcon(icon: DocsTabIcon, size: number) {
  const IconComponent = TAB_ICONS[icon];
  return <IconComponent size={size} />;
}

/** Section switcher. The closed control shows the current section. */
export function DocsTabs({ pathname, tabs }: DocsTabsProps) {
  const router = useRouter();
  const active = tabs.find((tab) => isTabKeyActive(tab.key, pathname)) ?? tabs[0];

  return (
    <Select
      allowDeselect={false}
      aria-label="Documentation section"
      data={tabs.map((tab) => ({ label: tab.title, value: tab.key }))}
      leftSection={active ? tabIcon(active.icon, 16) : null}
      leftSectionWidth={34}
      onChange={(value) => {
        const tab = tabs.find((item) => item.key === value);
        if (!tab || isTabKeyActive(tab.key, pathname)) {
          return;
        }
        router.push(routeAssert(tab.url));
      }}
      renderOption={({ option }) => {
        const tab = tabs.find((item) => item.key === option.value);
        if (!tab) {
          return option.label;
        }
        return (
          <Group gap="sm" wrap="nowrap">
            {tabIcon(tab.icon, 16)}
            {tab.title}
          </Group>
        );
      }}
      size="sm"
      value={active?.key ?? null}
    />
  );
}
