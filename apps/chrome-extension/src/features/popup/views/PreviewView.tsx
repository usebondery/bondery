import { Stack } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import type { PersonPreviewData } from "../../../lib/messaging/types";
import { PersonActionStack } from "../components/PersonActionStack";
import { PopupBrandHeader } from "../components/PopupBrandHeader";

interface PreviewViewProps {
  onOpenPerson: (contactId: string) => void;
  onOpenPersonWithAddInteraction: (contactId: string) => void;
  onOpenSettings: () => void;
  preview: PersonPreviewData;
}

export function PreviewView({
  preview,
  onOpenSettings,
  onOpenPerson,
  onOpenPersonWithAddInteraction,
}: PreviewViewProps) {
  return (
    <Stack gap="md" h={300} p="md">
      <PopupBrandHeader
        actionIcon={<IconSettings size={18} />}
        actionTitle="Settings"
        onActionClick={onOpenSettings}
      />

      <PersonActionStack
        avatar={preview.avatar}
        doesPersonExist
        firstName={preview.firstName}
        lastName={preview.lastName}
        onAddInteraction={() => onOpenPersonWithAddInteraction(preview.contactId)}
        onPersonClick={() => onOpenPerson(preview.contactId)}
        onViewOrImport={() => onOpenPerson(preview.contactId)}
        text={`${preview.firstName} is already in Bondery.`}
      />
    </Stack>
  );
}
