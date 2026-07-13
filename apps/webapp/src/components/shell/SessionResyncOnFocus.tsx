"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches app layout session when the tab becomes visible (stale background tabs). */
export function SessionResyncOnFocus() {
  const router = useRouter();

  useEffect(() => {
    const resync = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
    };
  }, [router]);

  return null;
}
