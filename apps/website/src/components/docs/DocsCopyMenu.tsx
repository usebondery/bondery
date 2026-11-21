"use client";

import {
  DropdownOption,
  DropdownOptionMenu,
  errorNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};
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
  const pending = useRef<boolean>(false);

  async function copyMarkdownLink() {
    const url = new URL(markdownUrl, location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      notifications.show(
        successNotificationTemplate({
          description: docs.Copy.LinkCopiedDescription,
          title: docs.Copy.LinkCopiedTitle,
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          description: docs.Copy.FailedLinkDescription,
          title: docs.Copy.FailedTitle,
        }),
      );
    }
  }

  function beginCopy(): boolean {
    if (pending.current) {
      return false;
    }

    pending.current = true;
    return true;
  }

  async function copyMarkdown() {
    if (!beginCopy()) {
      return;
    }

    try {
      const response = await fetch(markdownUrl);
      if (!response.ok) {
        throw new Error("Copy failed");
      }

      const markdown = await response.text();
      await navigator.clipboard.writeText(markdown);
      notifications.show(
        successNotificationTemplate({
          description: docs.Copy.MarkdownCopiedDescription,
          title: docs.Copy.MarkdownCopiedTitle,
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          description: docs.Copy.FailedMarkdownDescription,
          title: docs.Copy.FailedTitle,
        }),
      );
    } finally {
      pending.current = false;
    }
  }

  return (
    <Button.Group data-page-url={pageUrl}>
      <Button onClick={() => void copyMarkdownLink()} type="button" variant="default">
        {docs.Copy.LinkLabel}
      </Button>
      <DropdownOptionMenu position="bottom-end" width={240} withinPortal>
        <Menu.Target>
          <Button aria-haspopup="menu" aria-label={docs.Copy.MoreActions} px="xs" variant="default">
            <IconChevronDown size={16} />
          </Button>
        </Menu.Target>
        <Menu.Dropdown miw={220}>
          <DropdownOption
            icon={<IconMarkdown size={16} />}
            label={docs.Copy.CopyMarkdown}
            onSelect={() => void copyMarkdown()}
          />
          <DropdownOption
            external
            icon={<IconBrandGithub size={16} />}
            label={docs.Copy.OpenOnGitHub}
            onSelect={() => openInNewTab(githubUrl)}
          />
          <DropdownOption
            external
            icon={<IconMarkdown size={16} />}
            label={docs.Copy.ViewAsMarkdown}
            onSelect={() => openInNewTab(markdownUrl)}
          />
        </Menu.Dropdown>
      </DropdownOptionMenu>
    </Button.Group>
  );
}
