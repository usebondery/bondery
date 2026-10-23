import {
  expandPersonMentionsForEditor,
  extractPersonMentionIds,
  htmlToMarkdown,
} from "@bondery/helpers/notes";
import { useEffect, useState } from "react";
import { syncEffectState } from "../../../lib/react/syncEffectState";
import { getContactNamesByIds } from "../../../lib/sync/hooks/useSyncQuery";

const EMPTY_MENTION_IDS: ReadonlySet<string> = new Set();

function hasStoredContactNotes(notes: string | null | undefined): boolean {
  return Boolean(notes) && notes !== "<p></p>";
}

function runWhenIdle(callback: () => void): () => void {
  const globalObject = globalThis as {
    cancelIdleCallback?: (handle: number) => void;
    requestIdleCallback?: (idleCallback: () => void) => number;
  };

  if (typeof globalObject.requestIdleCallback === "function") {
    const idleHandle = globalObject.requestIdleCallback(() => {
      callback();
    });
    return () => globalObject.cancelIdleCallback?.(idleHandle);
  }

  const timeoutHandle = setTimeout(callback, 0);
  return () => clearTimeout(timeoutHandle);
}

/** Convert notes after the profile paints so opening a contact does not hitch. */
export function useDeferredContactNotes(notesHtml: string | null | undefined): {
  isPending: boolean;
  mentionableContactIds: ReadonlySet<string>;
  notesMarkdown: string;
} {
  const [isPending, setIsPending] = useState(() => hasStoredContactNotes(notesHtml));
  const [notesMarkdown, setNotesMarkdown] = useState("");
  const [mentionableContactIds, setMentionableContactIds] =
    useState<ReadonlySet<string>>(EMPTY_MENTION_IDS);

  useEffect(() => {
    if (!hasStoredContactNotes(notesHtml)) {
      syncEffectState(() => {
        setIsPending(false);
        setNotesMarkdown("");
        setMentionableContactIds(EMPTY_MENTION_IDS);
      });
      return;
    }

    syncEffectState(() => {
      setIsPending(true);
    });
    const cancel = runWhenIdle(() => {
      const source = htmlToMarkdown(notesHtml ?? "");
      const names = getContactNamesByIds(extractPersonMentionIds(source));
      setNotesMarkdown(expandPersonMentionsForEditor(source, (mentionId) => names.get(mentionId)));
      setMentionableContactIds(new Set(names.keys()));
      setIsPending(false);
    });

    return cancel;
  }, [notesHtml]);

  return {
    isPending,
    mentionableContactIds,
    notesMarkdown,
  };
}
