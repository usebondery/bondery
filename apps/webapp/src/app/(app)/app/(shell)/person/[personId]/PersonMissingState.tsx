import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { Stack, Text } from "@mantine/core";
import { ErrorPageHeader } from "@/components/shell/ErrorPageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { getSingleContactPageTranslations } from "@/lib/i18n/generated/hooks.server";
import { routeAssert } from "@/lib/navigation/route/assert";

export async function PersonMissingState({ description }: { description?: string }) {
  const t = await getSingleContactPageTranslations();

  return (
    <PageWrapper>
      <ErrorPageHeader
        backHref={routeAssert(WEBAPP_ROUTES.PEOPLE)}
        iconType="user"
        title={t("PersonNotFound")}
      />
      <Stack gap="xl">
        <Text c="dimmed">{description ?? t("PersonNotFoundDescription")}</Text>
      </Stack>
    </PageWrapper>
  );
}
