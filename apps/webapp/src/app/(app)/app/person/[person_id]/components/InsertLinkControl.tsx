"use client";

import { useState } from "react";
import { Button, Popover, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { useWindowEvent } from "@mantine/hooks";
import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";
import { useEditorState } from "@tiptap/react";
import { IconLink } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";

/**
 * Custom insert-link control for RichTextEditor.
 */
export function InsertLinkControl() {
  const t = useTranslations("NotesEditor");
  const { editor } = useRichTextEditorContext();
  const [opened, setOpened] = useState(false);
  const [url, setUrl] = useState("");

  const isLinkActive =
    useEditorState({
      editor,
      selector: ({ editor: ed }) => ed?.isActive("link") ?? false,
    }) ?? false;

  const handleOpen = () => {
    const linkData = editor?.getAttributes("link");
    setUrl(linkData?.href || "");
    setOpened(true);
  };

  const handleClose = () => {
    setOpened(false);
    setUrl("");
  };

  useWindowEvent("edit-link", handleOpen);

  const handleSave = () => {
    if (!url.trim()) {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      let href = url.trim();
      if (href && !/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) {
        href = `https://${href}`;
      }
      editor
        ?.chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href, target: "_blank", rel: "noopener noreferrer" })
        .run();
    }

    handleClose();
  };

  return (
    <Popover
      opened={opened}
      onChange={(o) => !o && handleClose()}
      withinPortal
      shadow="md"
      trapFocus
      position="bottom-start"
    >
      <Tooltip
        label={
          <Stack gap={2}>
            <Text size="xs" fw={600} lh={1.3}>
              {t("InsertLink")}
            </Text>
            <Text size="xs" c="dimmed" lh={1.3}>
              {t("InsertLinkHint")}
            </Text>
          </Stack>
        }
        withinPortal
        openDelay={400}
      >
        <Popover.Target>
          <RichTextEditor.Control
            aria-label={t("InsertLinkAriaLabel")}
            onClick={handleOpen}
            active={isLinkActive}
          >
            <IconLink size={16} stroke={1.5} />
          </RichTextEditor.Control>
        </Popover.Target>
      </Tooltip>

      <Popover.Dropdown>
        <Stack gap="xs">
          <TextInput
            placeholder={t("LinkPlaceholder")}
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
            size="xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
          />
          <Button size="xs" variant="default" onClick={handleSave}>
            {t("SaveLink")}
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
