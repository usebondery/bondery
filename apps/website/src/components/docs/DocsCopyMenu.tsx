"use client";

import {
  DropdownOption,
  DropdownOptionMenu,
  errorNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { Button, Menu } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBrandGithub, IconChevronDown, IconMarkdown } from "@tabler/icons-react";
import { useRef } from "react";

export interface DocsCopyMenuProps {
  githubUrl: string;
  markdownUrl: string;
  pageUrl: string;
}

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function DocsCopyMenu({ githubUrl, markdownUrl, pageUrl }: DocsCopyMenuProps) {
  const pending = useRef(false);

  async function copyMarkdownLink() {
    const url = new URL(markdownUrl, location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      notifications.show(
        successNotificationTemplate({
          description: "The markdown link is on your clipboard.",
          title: "Markdown link copied",
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          description: "Select the address and press Ctrl+C.",
          title: "Copy failed",
        }),
      );
    }
  }

  async function copyMarkdown() {
    if (pending.current) {
      return;
    }

    pending.current = true;
    try {
      const response = await fetch(markdownUrl);
      if (!response.ok) {
        throw new Error("Copy failed");
      }

      const markdown = await response.text();
      await navigator.clipboard.writeText(markdown);
      notifications.show(
        successNotificationTemplate({
          description: "The page markdown is on your clipboard.",
          title: "Markdown copied",
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          description: "Select the text and press Ctrl+C.",
          title: "Copy failed",
        }),
      );
    } finally {
      pending.current = false;
    }
  }

  return (
    <Button.Group data-page-url={pageUrl}>
      <Button onClick={() => void copyMarkdownLink()} type="button" variant="default">
        Copy markdown link
      </Button>
      <DropdownOptionMenu position="bottom-end" width={240} withinPortal>
        <Menu.Target>
          <Button aria-haspopup="menu" aria-label="More page actions" px="xs" variant="default">
            <IconChevronDown size={16} />
          </Button>
        </Menu.Target>
        <Menu.Dropdown miw={220}>
          <DropdownOption
            icon={<IconMarkdown size={16} />}
            label="Copy markdown"
            onSelect={() => void copyMarkdown()}
          />
          <DropdownOption
            external
            icon={<IconBrandGithub size={16} />}
            label="Open on GitHub"
            onSelect={() => openInNewTab(githubUrl)}
          />
          <DropdownOption
            external
            icon={<IconMarkdown size={16} />}
            label="View as markdown"
            onSelect={() => openInNewTab(markdownUrl)}
          />
        </Menu.Dropdown>
      </DropdownOptionMenu>
    </Button.Group>
  );
}
