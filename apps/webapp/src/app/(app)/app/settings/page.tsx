import type { Metadata } from "next";
import { Stack } from "@mantine/core";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { ProfileCard } from "./components/ProfileCard";
import { DataManagementCard } from "./components/DataManagementCard";
import { serverApiFetch } from "@/lib/api/server";

import { ErrorPageHeader } from "@/app/(app)/app/components/ErrorPageHeader";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { HashScrollOnMount } from "../components/HashScrollOnMount";
import { PageWrapper } from "../components/PageWrapper";
import { PreferencesCard } from "./components/PreferencesCard";
import { TagsSection } from "./components/TagsSection";
import { SupportCard } from "./components/SupportCard";
import { SubscriptionCard } from "./components/SubscriptionCard";
import { ApiKeysSection } from "./components/ApiKeysSection";
import type { ApiKeyListItem, TagWithCount, SubscriptionStatus } from "@bondery/schemas";
import { SUPPORTED_LOCALES } from "@bondery/translations";
import type { SupportedLocale } from "@bondery/translations";
import { buildAvatarQueryString } from "@/lib/avatarParams";
import { API_URL } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SettingsPage");
  return { title: t("Title") };
}

export default async function SettingsPage() {
  const [response, tagsResponse, personResponse, subscriptionResponse, apiKeysResponse] =
    await Promise.all([
    serverApiFetch(API_ROUTES.ME_SETTINGS, undefined, { cache: "no-store" }),
    serverApiFetch(`${API_ROUTES.TAGS}?previewLimit=3`, undefined, { next: { tags: ["tags"] } }),
    serverApiFetch(`${API_ROUTES.ME_PERSON}?${buildAvatarQueryString("small")}`, undefined, {
      next: { tags: ["contacts"] },
    }),
    serverApiFetch(API_ROUTES.SUBSCRIPTIONS, undefined, { cache: "no-store" }),
    serverApiFetch(API_ROUTES.ME_API_KEYS, undefined, { cache: "no-store" }),
  ]);

  if (!response.ok) {
    console.error("Failed to fetch settings:", response.statusText);
  }

  const result = await response.json();
  const settings = result?.data || {};

  const tagsResult = tagsResponse.ok ? await tagsResponse.json() : { tags: [] };
  const initialTags = (tagsResult.tags as TagWithCount[]) || [];

  const personResult = personResponse.ok ? await personResponse.json() : null;
  const myselfPerson = personResult?.contact ?? null;

  const subscriptionResult = subscriptionResponse.ok ? await subscriptionResponse.json() : null;
  const subscriptionStatus: SubscriptionStatus | null = subscriptionResult?.data ?? null;

  const apiKeysResult = apiKeysResponse.ok ? await apiKeysResponse.json() : { apiKeys: [] };
  const initialApiKeys = (apiKeysResult.apiKeys as ApiKeyListItem[]) ?? [];

  // Fire-and-forget sync: bootstraps subscription for pre-existing Polar customers
  if (subscriptionStatus?.plan !== "premium") {
    serverApiFetch(API_ROUTES.SUBSCRIPTIONS_SYNC, { method: "POST" }).catch(() => {});
  }

  const timezone = settings.timezone || "UTC";
  const reminderSendHour =
    typeof settings.reminderSendHour === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(settings.reminderSendHour)
      ? settings.reminderSendHour
      : "08:00:00";
  const timeFormat = settings.timeFormat === "12h" ? "12h" : "24h";
  const rawLanguage: string = settings.language ?? "en";
  const language: SupportedLocale = (SUPPORTED_LOCALES as readonly string[]).includes(rawLanguage)
    ? (rawLanguage as SupportedLocale)
    : "en";
  const colorScheme =
    settings.colorScheme === "light" ||
    settings.colorScheme === "dark" ||
    settings.colorScheme === "auto"
      ? settings.colorScheme
      : "auto";
  const email = settings.email || "";
  const providers = settings.providers || [];
  const userIdentities = settings.identities ?? [];

  const t = await getTranslations("SettingsPage");

  return (
    <PageWrapper>
      <HashScrollOnMount />
      <ErrorPageHeader iconType="settings" title={t("Title")} />
      <Stack gap="xl">
        <SupportCard />

        <ProfileCard
          email={email}
          providers={providers}
          userIdentities={userIdentities}
          myselfPerson={myselfPerson}
        />

        <ApiKeysSection initialApiKeys={initialApiKeys} apiBaseUrl={API_URL} />

        {subscriptionStatus && (
          <SubscriptionCard subscriptionStatus={subscriptionStatus} />
        )}

        <PreferencesCard
          initialColorScheme={colorScheme}
          initialLanguage={language}
          initialTimezone={timezone}
          initialReminderSendHour={reminderSendHour}
          initialTimeFormat={timeFormat}
        />

        <TagsSection initialTags={initialTags} />

        <DataManagementCard />
      </Stack>
    </PageWrapper>
  );
}
