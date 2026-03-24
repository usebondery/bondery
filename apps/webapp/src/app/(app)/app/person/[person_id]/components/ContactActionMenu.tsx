import { Button, Menu, MenuItem, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowMerge,
  IconBrandLinkedin,
  IconDotsVertical,
  IconId,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import type { Contact } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { useState } from "react";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import { useTranslations } from "next-intl";
import { useBatchEnrichFromLinkedIn } from "@/lib/extension/useBatchEnrichFromLinkedIn";
import { revalidateContacts } from "../../../actions";

interface ContactActionMenuProps {
  contact: Contact;
  personId: string;
  onDelete: () => void;
  onMergeWith: () => void;
  onShare: () => void;
}

export function ContactActionMenu({
  contact,
  personId,
  onDelete,
  onMergeWith,
  onShare,
}: ContactActionMenuProps) {
  const tMerge = useTranslations("MergeWithModal");
  const tShare = useTranslations("ShareContactModal");
  const tEnrich = useTranslations("EnrichFromLinkedIn");
  const tActions = useTranslations("ContactActionMenu");
  const { startForPerson } = useBatchEnrichFromLinkedIn();

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
          title: tActions("ExportSuccess"),
          description: tActions("ExportSuccessDescription"),
        }),
      );
    } catch (error) {
      console.error("Failed to export vCard:", error);
      notifications.show(
        errorNotificationTemplate({
          title: tActions("ExportError"),
          description: tActions("ExportErrorDescription"),
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
          {tActions("ActionsButton")}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <MenuItem leftSection={<IconShare size={16} />} onClick={onShare}>
          {tShare("ActionLabelMenu")}
        </MenuItem>
        <MenuItem leftSection={<IconId size={16} />} onClick={handleExport}>
          {tActions("DownloadVCard")}
        </MenuItem>
        <MenuItem
          leftSection={<IconBrandLinkedin size={16} />}
          onClick={() => startForPerson(personId, contact.linkedin)}
        >
          {tEnrich("MenuLabel")}
        </MenuItem>
        <MenuItem leftSection={<IconArrowMerge size={16} />} onClick={onMergeWith}>
          {tMerge("ActionLabelMenu")}
        </MenuItem>
        <Tooltip
          label={tActions("CannotDeleteMyself")}
          disabled={!contact.myself}
          withArrow
          multiline
          maw={220}
        >
          <div>
            <MenuItem
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={onDelete}
              disabled={!!contact.myself}
            >
              {tActions("DeleteContact")}
            </MenuItem>
          </div>
        </Tooltip>
      </Menu.Dropdown>
    </Menu>
  );
}
