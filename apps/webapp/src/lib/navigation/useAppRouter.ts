"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export function useAppRouter() {
  const router = useRouter();

  return useMemo(
    () => ({
      back: router.back,
      forward: router.forward,
      pushRoute: (href: Route) => router.push(href),
      refresh: router.refresh,
      replaceRoute: (href: Route) => router.replace(href),
    }),
    [router],
  );
}
