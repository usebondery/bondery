import React from "react";
import { Stack } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { PersonActionStack } from "../components/PersonActionStack";
import { PopupBrandHeader } from "../components/PopupBrandHeader";
import type { PersonPreviewData } from "../../utils/messages";

interface PreviewViewProps {
  preview: PersonPreviewData;
  onOpenSettings: () => void;
  onOpenPerson: (contactId: string) => void;
  onOpenPersonWithAddEvent: (contactId: string) => void;
}

export function PreviewView({
  preview,
  onOpenSettings,
  onOpenPerson,
  onOpenPersonWithAddEvent,
}: PreviewViewProps) {
  return (
    <Stack p="md" gap="md" h={300}>
      <PopupBrandHeader
        actionIcon={<IconSettings size={18} />}
        onActionClick={onOpenSettings}
        actionTitle="Settings"
      />

      <PersonActionStack
        text={`${preview.firstName} is already in Bondery.`}
        firstName={preview.firstName}
        lastName={preview.lastName}
        avatar={preview.avatar}
        doesPersonExist
        onPersonClick={() => onOpenPerson(preview.contactId)}
        onViewOrImport={() => onOpenPerson(preview.contactId)}
        onAddEvent={() => onOpenPersonWithAddEvent(preview.contactId)}
      />
    </Stack>
  );
}
