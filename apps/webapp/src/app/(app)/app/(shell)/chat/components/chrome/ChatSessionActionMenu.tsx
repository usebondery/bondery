"use client";

import { Button, Menu, MenuItem } from "@mantine/core";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useChatPageTranslations } from "@/lib/i18n/generated/hooks";

interface ChatSessionActionMenuProps {
  onDelete: () => void;
}

export function ChatSessionActionMenu({ onDelete }: ChatSessionActionMenuProps) {
  const t = useChatPageTranslations();
  const [opened, setOpened] = useState(false);

  return (
    <Menu
      onClose={() => setOpened(false)}
      onOpen={() => setOpened(true)}
      opened={opened}
      shadow="md"
    >
      <Menu.Target>
        <Button
          className={`button-scale-effect ${opened ? "button-scale-effect-active" : ""}`}
          leftSection={<IconDotsVertical size={18} />}
        >
          {t("actionsButton")}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <MenuItem color="red" leftSection={<IconTrash size={16} />} onClick={onDelete}>
          {t("deleteSession")}
        </MenuItem>
      </Menu.Dropdown>
    </Menu>
  );
}
