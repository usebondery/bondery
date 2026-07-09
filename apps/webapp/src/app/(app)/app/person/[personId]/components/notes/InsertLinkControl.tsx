"use client";

import { Button, Popover, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { useWindowEvent } from "@mantine/hooks";
import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";
import { IconLink } from "@tabler/icons-react";
import { useEditorState } from "@tiptap/react";
import { useState } from "react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

/**
 * Custom insert-link control for RichTextEditor.
 */
export function InsertLinkControl() {
  const t = useWebTranslations("NotesEditor");
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
        .setLink({ href, rel: "noopener noreferrer", target: "_blank" })
        .run();
    }

    handleClose();
  };

  return (
    <Popover
      onChange={(o) => !o && handleClose()}
      opened={opened}
      position="bottom-start"
      shadow="md"
      trapFocus
      withinPortal
    >
      <Tooltip
        label={
          <Stack gap={2}>
            <Text fw={600} lh={1.3} size="xs">
              {t("InsertLink")}
            </Text>
            <Text c="dimmed" lh={1.3} size="xs">
              {t("InsertLinkHint")}
            </Text>
          </Stack>
        }
        openDelay={400}
        withinPortal
      >
        <Popover.Target>
          <RichTextEditor.Control
            active={isLinkActive}
            aria-label={t("InsertLinkAriaLabel")}
            onClick={handleOpen}
          >
            <IconLink size={16} stroke={1.5} />
          </RichTextEditor.Control>
        </Popover.Target>
      </Tooltip>

      <Popover.Dropdown>
        <Stack gap="xs">
          <TextInput
            autoFocus
            onChange={(e) => setUrl(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder={t("LinkPlaceholder")}
            size="xs"
            value={url}
          />
          <Button onClick={handleSave} size="xs" variant="default">
            {t("SaveLink")}
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
