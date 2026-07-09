import type { QueryClient } from "@tanstack/react-query";
import { getMePersonServer } from "@/lib/api/domains/server/mePerson";
import type { AvatarPreset } from "@/lib/contacts/avatarParams";
import { settingsKeys } from "@/lib/query/keys";

export async function prefetchMePerson(
  queryClient: QueryClient,
  avatarPreset: AvatarPreset = "small",
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getMePersonServer(avatarPreset),
    queryKey: settingsKeys.mePerson(avatarPreset),
  });
}
