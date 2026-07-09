import { BonderyLogotypeBlack, BonderyLogotypeWhite } from "@bondery/branding/react";
import { ActionIcon, Box, Divider, Group } from "@mantine/core";
import type React from "react";

interface PopupBrandHeaderProps {
  actionIcon: React.ReactNode;
  actionTitle: string;
  onActionClick: () => void;
}

export function PopupBrandHeader({
  actionIcon,
  onActionClick,
  actionTitle,
}: PopupBrandHeaderProps) {
  return (
    <div>
      <Group justify="space-between">
        <Group gap="xs">
          <Box darkHidden>
            <BonderyLogotypeBlack height={28} width={120} />
          </Box>
          <Box lightHidden>
            <BonderyLogotypeWhite height={28} width={120} />
          </Box>
        </Group>
        <ActionIcon color="gray" onClick={onActionClick} title={actionTitle} variant="subtle">
          {actionIcon}
        </ActionIcon>
      </Group>
      <Divider mt={"xs"} />
    </div>
  );
}
