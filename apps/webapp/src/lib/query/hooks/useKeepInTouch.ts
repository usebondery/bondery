"use client";



import { useQuery } from "@tanstack/react-query";

import { createKeepInTouchQueryFn } from "@/lib/query/fetchers/keepInTouch";

import { contactKeys } from "@/lib/query/keys";



export function useKeepInTouchQuery() {

  return useQuery({

    queryKey: contactKeys.keepInTouch(),

    queryFn: createKeepInTouchQueryFn(),

  });

}


