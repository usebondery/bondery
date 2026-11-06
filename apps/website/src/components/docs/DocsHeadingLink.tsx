"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCheck, IconLink } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

const COPIED_MS = 1500;

type DocsHeadingLinkProps = {
  id: string;
};

/** Hash link for a section. Visible on hover. The tooltip reports the copy. */
export function DocsHeadingLink({ id }: DocsHeadingLinkProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  function handleClick() {
    const url = `${location.origin}${location.pathname}#${id}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
      resetTimer.current = window.setTimeout(() => {
        setCopied(false);
        resetTimer.current = null;
      }, COPIED_MS);
    });
  }

  return (
    <Tooltip label={copied ? "Copied" : "Copy link"} opened={copied ? true : undefined}>
      <ActionIcon
        aria-label={copied ? "Copied" : "Copy link to section"}
        c="dimmed"
        className="docsHeadingAnchor"
        color="gray"
        component="a"
        href={`#${id}`}
        onClick={handleClick}
        size="sm"
        variant="subtle"
      >
        {copied ? <IconCheck size={14} /> : <IconLink size={14} />}
      </ActionIcon>
    </Tooltip>
  );
}
