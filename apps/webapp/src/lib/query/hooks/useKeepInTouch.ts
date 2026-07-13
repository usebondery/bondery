"use client";

import { useQuery } from "@tanstack/react-query";
import { getKeepInTouchContacts, getKeepInTouchOverdueCount } from "@/lib/api/domains/keepInTouch";
import { contactKeys } from "@/lib/query/keys";

export function useKeepInTouchQuery() {
  return useQuery({
    queryFn: getKeepInTouchContacts,
    queryKey: contactKeys.keepInTouch(),
  });
}

export function useKeepInTouchCountQuery() {
  return useQuery({
    queryFn: getKeepInTouchOverdueCount,
    queryKey: contactKeys.keepInTouchCount(),
    staleTime: 2 * 60_000,
  });
}
