import { Button, Stack, TextInput } from "@mantine/core";
import { IconArrowLeft, IconLogout } from "@tabler/icons-react";
import { config } from "../../../config";
import { useExtensionPopupTranslations } from "../../../lib/i18n/generated/hooks";
import { PopupBrandHeader } from "../components/PopupBrandHeader";
import { ThemePicker } from "../components/ThemePicker";
import { UserCard } from "../components/UserCard";
import type { UserInfo } from "../types";

interface SettingsViewProps {
  onBack: () => void;
  onLogout: () => Promise<void>;
  onThemeChange: (value: string) => Promise<void>;
  themePreference: "light" | "dark" | "auto";
  user: UserInfo | null;
}

export function SettingsView({
  user,
  themePreference,
  onThemeChange,
  onLogout,
  onBack,
}: SettingsViewProps) {
  const t = useExtensionPopupTranslations("Settings");
  return (
    <Stack gap="md" mih={300} p="md">
      <PopupBrandHeader actionIcon={<IconArrowLeft />} actionTitle="Back" onActionClick={onBack} />
      <Stack gap="md" style={{ flex: 1 }}>
        {user && (
          <UserCard
            avatarUrl={user.avatarUrl}
            name={user.name || user.email || "User"}
            subtitle={user.email || undefined}
          />
        )}

        <TextInput disabled label={t("ApiServer")} value={config.apiUrl} />

        <ThemePicker
          labels={{
            dark: "Dark",
            light: "Light",
            system: "System",
            title: "Theme",
          }}
          onChange={onThemeChange}
          value={themePreference}
        />
        <Button
          color="blue"
          leftSection={<IconLogout size={16} />}
          mt="auto"
          onClick={onLogout}
          variant="light"
        >
          {t("SignOut")}
        </Button>
      </Stack>
    </Stack>
  );
}
