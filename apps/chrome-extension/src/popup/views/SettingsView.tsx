import React from "react";
import { Button, Stack } from "@mantine/core";
import { IconArrowLeft, IconLogout } from "@tabler/icons-react";
import { ThemePicker } from "../components/ThemePicker";
import { UserCard } from "../components/UserCard";
import { PopupBrandHeader } from "../components/PopupBrandHeader";
import type { UserInfo } from "../types";

interface SettingsViewProps {
  user: UserInfo | null;
  themePreference: "light" | "dark" | "auto";
  onThemeChange: (value: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onBack: () => void;
}

export function SettingsView({
  user,
  themePreference,
  onThemeChange,
  onLogout,
  onBack,
}: SettingsViewProps) {
  return (
    <Stack p="md" gap="md" h={300}>
      <PopupBrandHeader
        actionIcon={<IconArrowLeft size={18} />}
        onActionClick={onBack}
        actionTitle="Back"
      />
      <Stack gap="md" style={{ flex: 1 }}>
        {user && (
          <UserCard
            name={user.name || user.email || "User"}
            subtitle={user.email || undefined}
            avatarUrl={user.avatarUrl}
          />
        )}

        <ThemePicker
          value={themePreference}
          onChange={onThemeChange}
          labels={{
            title: "Theme",
            light: "Light",
            dark: "Dark",
            system: "System",
          }}
        />
        <Button
          color="blue"
          variant="light"
          onClick={onLogout}
          leftSection={<IconLogout size={16} />}
          mt="auto"
        >
          Sign out
        </Button>
      </Stack>
    </Stack>
  );
}
