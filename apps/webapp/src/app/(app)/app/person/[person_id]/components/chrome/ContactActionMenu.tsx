import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import type { Contact } from "@bondery/schemas";
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
import { useState } from "react";
import { useBatchEnrichFromLinkedIn } from "@/components/extension/useBatchEnrichFromLinkedIn";
import { downloadContactVcard } from "@/lib/api/domains/contacts";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

interface ContactActionMenuProps {
  contact: Contact;
  /** When true, hides delete and merge options (used on the Myself profile page). */
  myselfMode?: boolean;
  onDelete: () => void;
  onMergeWith: () => void;
  onShare: () => void;
  personId: string;
}

export function ContactActionMenu({
  contact,
  personId,
  onDelete,
  onMergeWith,
  onShare,
  myselfMode = false,
}: ContactActionMenuProps) {
  const tMerge = useWebTranslations("MergeWithModal");
  const tShare = useWebTranslations("ShareContactModal");
  const tEnrich = useWebTranslations("EnrichFromLinkedIn");
  const tActions = useWebTranslations("ContactActionMenu");
  const { startForPerson } = useBatchEnrichFromLinkedIn();

  const handleExport = async () => {
    try {
      const response = await downloadContactVcard(personId);
      if (!response.ok) {
        throw new Error("Failed to export vCard");
      }

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
          description: tActions("ExportSuccessDescription"),
          title: tActions("ExportSuccess"),
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          description: tActions("ExportErrorDescription"),
          title: tActions("ExportError"),
        }),
      );
    }
  };

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
        {!myselfMode && (
          <Tooltip
            disabled={!contact.myself}
            label={tActions("CannotMergeMyself")}
            maw={220}
            multiline
            withArrow
          >
            <div>
              <MenuItem
                disabled={!!contact.myself}
                leftSection={<IconArrowMerge size={16} />}
                onClick={onMergeWith}
              >
                {tMerge("ActionLabelMenu")}
              </MenuItem>
            </div>
          </Tooltip>
        )}
        {!myselfMode && (
          <Tooltip
            disabled={!contact.myself}
            label={tActions("CannotDeleteMyself")}
            maw={220}
            multiline
            withArrow
          >
            <div>
              <MenuItem
                color="red"
                disabled={!!contact.myself}
                leftSection={<IconTrash size={16} />}
                onClick={onDelete}
              >
                {tActions("DeleteContact")}
              </MenuItem>
            </div>
          </Tooltip>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
