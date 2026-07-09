"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { DEFAULT_PERSON_TAB, PERSON_TABS, type PersonTabValue } from "../utils/personTabConstants";

export function usePersonTabNavigation(initialTab?: string) {
  const router = useRouter();
  const pathname = usePathname();

  const resolvedInitialTab: PersonTabValue = PERSON_TABS.includes(initialTab as PersonTabValue)
    ? (initialTab as PersonTabValue)
    : DEFAULT_PERSON_TAB;
  const [activeTab, setActiveTab] = useState<PersonTabValue>(resolvedInitialTab);

  const handleTabChange = useCallback(
    (value: string | null) => {
      const tab = PERSON_TABS.includes(value as PersonTabValue)
        ? (value as PersonTabValue)
        : DEFAULT_PERSON_TAB;
      setActiveTab(tab);
      const query = tab === DEFAULT_PERSON_TAB ? "" : `?tab=${tab}`;
      router.replace(`${pathname}${query}`, { scroll: false });
    },
    [pathname, router],
  );

  return { activeTab, handleTabChange };
}
