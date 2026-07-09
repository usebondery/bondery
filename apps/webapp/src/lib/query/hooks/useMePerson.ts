"use client";

import { useQuery } from "@tanstack/react-query";
import { getMePerson } from "@/lib/api/domains/mePerson";
import type { AvatarPreset } from "@/lib/contacts/avatarParams";

import { settingsKeys } from "@/lib/query/keys";

export function useMePersonQuery(avatarPreset: AvatarPreset = "small", enabled = true) {
  return useQuery({
    enabled,

    queryFn: () => getMePerson(avatarPreset),
    queryKey: settingsKeys.mePerson(avatarPreset),
  });
}
