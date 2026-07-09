import { formatContactName } from "@bondery/helpers/contact";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { Stack, Text } from "@mantine/core";
import type { Metadata } from "next";
import { cache } from "react";
import { ErrorPageHeader } from "@/components/shell/ErrorPageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { getContactDetailServer } from "@/lib/api/domains/server/contacts";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { entityPageTitle } from "@/lib/metadata/pageTitles";
import { PersonLoader } from "./PersonLoader";

const getContactForPage = cache((id: string) => getContactDetailServer(id, "large"));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ personId: string }>;
}): Promise<Metadata> {
  const { personId } = await params;
  try {
    const contact = await getContactForPage(personId);
    return entityPageTitle(formatContactName(contact));
  } catch {
    const t = await getTranslations("SingleContactPage");
    return entityPageTitle(t("PersonFallbackTitle"));
  }
}

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { personId } = await params;
  const { tab } = await searchParams;
  const t = await getTranslations("SingleContactPage");

  if (!personId) {
    return (
      <PageWrapper>
        <ErrorPageHeader
          backHref={API_ROUTES.CONTACTS}
          iconType="user"
          title={t("PersonNotFound")}
        />
        <Stack gap="xl">
          <Text c="dimmed">{t("PersonNotSelected")}</Text>
        </Stack>
      </PageWrapper>
    );
  }

  return (
    <PersonLoader initialTab={typeof tab === "string" ? tab : undefined} personId={personId} />
  );
}
