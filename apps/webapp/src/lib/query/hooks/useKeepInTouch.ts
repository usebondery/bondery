"use client";

import { useQuery } from "@tanstack/react-query";
import { getKeepInTouchContacts } from "@/lib/api/domains/keepInTouch";
import { contactKeys } from "@/lib/query/keys";

export function useKeepInTouchQuery() {
  return useQuery({
    queryFn: getKeepInTouchContacts,
    queryKey: contactKeys.keepInTouch(),
  });
}
