import type { Metadata } from "next";
import { Stack } from "@mantine/core";
import { getTranslations } from "next-intl/server";
import { ProfileCard } from "./components/ProfileCard";
import { DataManagementCard } from "./components/DataManagementCard";
import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/authHeaders";

import { ErrorPageHeader } from "@/app/(app)/app/components/ErrorPageHeader";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { PageWrapper } from "../components/PageWrapper";
import { PreferencesCard } from "./components/PreferencesCard";
import { TagsSection } from "./components/TagsSection";
import { SupportCard } from "./components/SupportCard";
import { SubscriptionCard } from "./components/SubscriptionCard";
import type { TagWithCount } from "@bondery/schemas";
import type { SubscriptionStatus } from "@bondery/schemas";
import { buildAvatarQueryString } from "@/lib/avatarParams";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const headers = await getAuthHeaders();

  const [response, tagsResponse, personResponse, subscriptionResponse] =
    await Promise.all([
      fetch(`${API_URL}${API_ROUTES.ME_SETTINGS}`, {
        next: { tags: ["settings"] },
        headers,
      }),
      fetch(`${API_URL}${API_ROUTES.TAGS}?previewLimit=3`, {
        next: { tags: ["tags"] },
        headers,
      }),
      fetch(
        `${API_URL}${API_ROUTES.ME_PERSON}?${buildAvatarQueryString("small")}`,
        {
          next: { tags: ["contacts"] },
          headers,
        },
      ),
      fetch(`${API_URL}${API_ROUTES.SUBSCRIPTIONS}`, {
        cache: "no-store",
        headers,
      }),
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

  const subscriptionResult = subscriptionResponse.ok
    ? await subscriptionResponse.json()
    : null;
  const subscriptionStatus: SubscriptionStatus | null =
    subscriptionResult?.data ?? null;

  // Fire-and-forget sync: bootstraps subscription for pre-existing Polar customers
  if (subscriptionStatus?.plan !== "premium") {
    fetch(`${API_URL}${API_ROUTES.SUBSCRIPTIONS_SYNC}`, {
      method: "POST",
      headers,
    }).catch(() => {});
  }

  const timezone = settings.timezone || "UTC";
  const reminderSendHour =
    typeof settings.reminderSendHour === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(settings.reminderSendHour)
      ? settings.reminderSendHour
      : "08:00:00";
  const timeFormat = settings.timeFormat === "12h" ? "12h" : "24h";
  const language = "en";
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
      <ErrorPageHeader iconType="settings" title={t("Title")} />
      <Stack gap="xl">
        <SupportCard />

        <ProfileCard
          email={email}
          providers={providers}
          userIdentities={userIdentities}
          myselfPerson={myselfPerson}
        />

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
