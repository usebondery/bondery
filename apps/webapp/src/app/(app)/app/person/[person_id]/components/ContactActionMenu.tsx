import { Button, Menu, MenuItem } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconDotsVertical, IconId, IconTrash, IconX } from "@tabler/icons-react";
import type { Contact } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers";
import { useState } from "react";

interface ContactActionMenuProps {
  contact: Contact;
  personId: string;
  onDelete: () => void;
}

export function ContactActionMenu({ contact, personId, onDelete }: ContactActionMenuProps) {
  const handleExport = async () => {
    try {
      const response = await fetch(`${API_ROUTES.CONTACTS}/${personId}/vcard`);
      if (!response.ok) throw new Error("Failed to export vCard");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const firstName = contact.firstName || "contact";
      const lastName = contact.lastName || "";
      a.download = lastName ? `${firstName}_${lastName}.vcf` : `${firstName}.vcf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      notifications.show({
        title: "Success",
        message: "Contact exported as vCard",
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch (error) {
      console.error("Failed to export vCard:", error);
      notifications.show({
        title: "Error",
        message: "Failed to export contact. Please try again.",
        color: "red",
        icon: <IconX size={18} />,
      });
    }
  };

  const [opened, setOpened] = useState(false);

  return (
    <Menu
      shadow="md"
      opened={opened}
      onOpen={() => setOpened(true)}
      onClose={() => setOpened(false)}
    >
      <Menu.Target>
        <Button
          className={`button-scale-effect ${opened ? "button-scale-effect-active" : ""}`}
          leftSection={<IconDotsVertical size={18} />}
        >
          Actions
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <MenuItem leftSection={<IconId size={16} />} onClick={handleExport}>
          Download vCard
        </MenuItem>
        <MenuItem color="red" leftSection={<IconTrash size={16} />} onClick={onDelete}>
          Delete Contact
        </MenuItem>
      </Menu.Dropdown>
    </Menu>
  );
}
