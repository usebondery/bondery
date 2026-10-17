"use client";

import { useRouter } from "next/navigation";
import { setOptimisticDocumentTitle } from "@/lib/metadata/navigationTitleStore";

/**
 * Client navigation that sets the tab title before the route transition starts.
 */
export function useNavigateWithTitle() {
  const router = useRouter();

  const navigateWithTitle = (href: string, title: string) => {
    const trimmed = title.trim();
    if (trimmed) {
      setOptimisticDocumentTitle(trimmed);
    }
    router.push(href);
  };

  return { navigateWithTitle };
}
