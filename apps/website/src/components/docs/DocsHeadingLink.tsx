"use client";

import { detachPromise } from "@bondery/helpers/async";
import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};
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
  const resetTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  function handleClick() {
    const url = `${location.origin}${location.pathname}#${id}`;
    detachPromise(
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        if (resetTimerRef.current !== null) {
          window.clearTimeout(resetTimerRef.current);
        }
        resetTimerRef.current = window.setTimeout(() => {
          setCopied(false);
          resetTimerRef.current = null;
        }, COPIED_MS);
      }),
    );
  }

  return (
    <Tooltip
      label={copied ? docs.Copy.HeadingCopied : docs.Copy.HeadingCopyLink}
      opened={copied ? true : undefined}
    >
      <ActionIcon
        aria-label={copied ? docs.Copy.HeadingCopied : docs.Copy.HeadingCopyLinkAria}
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
