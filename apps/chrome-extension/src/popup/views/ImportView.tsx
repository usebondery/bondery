import React from "react";
import { Stack } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { PersonActionStack } from "../components/PersonActionStack";
import { PopupBrandHeader } from "../components/PopupBrandHeader";
import type { ScrapedProfileData } from "../../utils/messages";

interface ImportViewProps {
  activeProfile: ScrapedProfileData;
  loginLoading: boolean;
  error: string | null;
  onOpenSettings: () => void;
  onImport: () => Promise<void>;
}

export function ImportView({
  activeProfile,
  loginLoading,
  error,
  onOpenSettings,
  onImport,
}: ImportViewProps) {
  return (
    <Stack p="md" gap="md" h={300}>
      <PopupBrandHeader
        actionIcon={<IconSettings size={18} />}
        onActionClick={onOpenSettings}
        actionTitle="Settings"
      />

      <PersonActionStack
        text={`${activeProfile.firstName ?? activeProfile.handle} is not in Bondery yet.`}
        firstName={activeProfile.firstName ?? activeProfile.handle}
        lastName={activeProfile.lastName ?? null}
        avatar={undefined}
        doesPersonExist={false}
        isLoading={loginLoading}
        error={error}
        onViewOrImport={onImport}
      />
    </Stack>
  );
}
