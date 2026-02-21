import { Button, Menu, MenuItem } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDotsVertical, IconId, IconTrash } from "@tabler/icons-react";
import type { Contact } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { useState } from "react";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";

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

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: "Contact exported as vCard",
        }),
      );
    } catch (error) {
      console.error("Failed to export vCard:", error);
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: "Failed to export contact. Please try again.",
        }),
      );
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
