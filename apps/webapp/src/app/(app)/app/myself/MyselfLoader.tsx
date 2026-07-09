import { API_ROUTES } from "@bondery/helpers/globals/paths";

import { Stack, Text } from "@mantine/core";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ErrorPageHeader } from "@/app/(app)/app/components/ErrorPageHeader";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { getMePersonServer } from "@/lib/api/domains/server/mePerson";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { getQueryClient } from "@/lib/query/client";
import { contactKeys, settingsKeys } from "@/lib/query/keys";
import PersonClient from "../person/[person_id]/PersonClient";
import { prefetchPersonPageQueries } from "../person/[person_id]/prefetchPersonPageQueries";

interface MyselfLoaderProps {
  initialTab?: string;
}

export async function MyselfLoader({ initialTab }: MyselfLoaderProps) {
  const queryClient = getQueryClient();

  const t = await getTranslations("SingleContactPage");

  const mePerson = await queryClient.fetchQuery({
    queryFn: () => getMePersonServer("large"),
    queryKey: settingsKeys.mePerson("large"),
  });

  const personId = mePerson?.id ?? null;

  if (!personId) {
    return (
      <PageWrapper>
        <ErrorPageHeader
          backHref={API_ROUTES.CONTACTS}
          iconType="user"
          title={t("ProfileNotFound")}
        />

        <Stack gap="xl">
          <Text c="dimmed">{t("ProfileNotFoundDescription")}</Text>
        </Stack>
      </PageWrapper>
    );
  }

  queryClient.setQueryData(contactKeys.detail(personId), mePerson);

  await prefetchPersonPageQueries(queryClient, personId, { skipDetail: true });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PersonClient initialTab={initialTab} myselfMode personId={personId} />
    </HydrationBoundary>
  );
}
