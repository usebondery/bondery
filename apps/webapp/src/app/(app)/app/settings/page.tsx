import { Container, Title, Stack, Group } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { ProfileCard } from "./components/ProfileCard";
import { DataManagementCard } from "./components/DataManagementCard";
import { getApiUrl } from "@/lib/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthHeaders } from "@/lib/authHeaders";

export default async function SettingsPage() {
  const baseUrl = getApiUrl();

  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/api/settings`, {
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    console.error("Failed to fetch settings:", response.statusText);
  }

  const result = await response.json();
  const settings = result?.data || {};

  const name = settings.name || "";
  const middlename = settings.middlename || "";
  const surname = settings.surname || "";
  const timezone = settings.timezone || "UTC";
  const language = settings.language || "en";
  const email = settings.email || "";
  const avatarUrl = settings.avatar_url || null;
  const providers = settings.providers || [];

  // Fetch user identities from Supabase
  const supabase = await createServerSupabaseClient();
  const { data: identitiesData } = await supabase.auth.getUserIdentities();
  const userIdentities = identitiesData?.identities || [];

  const t = await getTranslations("SettingsPage");

  return (
    <Container size="md">
      <Stack gap="xl">
        <Group gap="sm">
          <IconSettings size={32} stroke={1.5} />
          <Title order={1}>{t("Title")}</Title>
        </Group>

        <ProfileCard
          initialName={name}
          initialMiddlename={middlename}
          initialSurname={surname}
          initialTimezone={timezone}
          initialLanguage={language}
          email={email}
          avatarUrl={avatarUrl}
          providers={providers}
          userIdentities={userIdentities}
        />

        <DataManagementCard />
      </Stack>
    </Container>
  );
}
