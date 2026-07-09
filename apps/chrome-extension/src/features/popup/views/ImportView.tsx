import { Stack } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import type { ScrapedProfileData } from "../../../lib/messaging/types";
import { PersonActionStack } from "../components/PersonActionStack";
import { PopupBrandHeader } from "../components/PopupBrandHeader";

interface ImportViewProps {
  activeProfile: ScrapedProfileData;
  error: string | null;
  loginLoading: boolean;
  onImport: () => Promise<void>;
  onOpenSettings: () => void;
}

export function ImportView({
  activeProfile,
  loginLoading,
  error,
  onOpenSettings,
  onImport,
}: ImportViewProps) {
  return (
    <Stack gap="md" h={300} p="md">
      <PopupBrandHeader
        actionIcon={<IconSettings size={18} />}
        actionTitle="Settings"
        onActionClick={onOpenSettings}
      />

      <PersonActionStack
        avatar={undefined}
        doesPersonExist={false}
        error={error}
        firstName={activeProfile.firstName ?? activeProfile.handle}
        isLoading={loginLoading}
        lastName={activeProfile.lastName ?? null}
        onViewOrImport={onImport}
        text={`${activeProfile.firstName ?? activeProfile.handle} is not in Bondery yet.`}
      />
    </Stack>
  );
}
