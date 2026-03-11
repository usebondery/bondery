import React from "react";
import { ActionIcon, Box, Divider, Group } from "@mantine/core";
import { BonderyLogotypeBlack, BonderyLogotypeWhite } from "@bondery/branding-src";

interface PopupBrandHeaderProps {
  actionIcon: React.ReactNode;
  onActionClick: () => void;
  actionTitle: string;
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
            <BonderyLogotypeBlack width={120} height={28} />
          </Box>
          <Box lightHidden>
            <BonderyLogotypeWhite width={120} height={28} />
          </Box>
        </Group>
        <ActionIcon variant="subtle" color="gray" onClick={onActionClick} title={actionTitle}>
          {actionIcon}
        </ActionIcon>
      </Group>
      <Divider mt={"xs"} />
    </div>
  );
}
