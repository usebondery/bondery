"use client";

import { successNotificationTemplate } from "@bondery/mantine-next";
import type { Contact } from "@bondery/schemas";
import type { TranslateFn } from "@bondery/translations";
import { notifications } from "@mantine/notifications";
import { Link } from "@mantine/tiptap";
import { Color } from "@tiptap/extension-color";
import Emoji from "@tiptap/extension-emoji";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { TextStyle } from "@tiptap/extension-text-style";
import { ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { TaskItemNodeView } from "../components/notes/TaskItemNodeView";
import { emojiSuggestionRender } from "../editor/emojiSuggestion";
import { InlineDateExtension } from "../editor/InlineDateExtension";
import { MarkdownPasteExtension } from "../editor/MarkdownPasteExtension";
import { createPersonMentionExtension } from "../editor/personMentionExtension";
import { SlashCommandExtension } from "../editor/SlashCommandExtension";

function isNotesEditorChrome(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (Boolean(target.closest('[data-notes-editor-toolbar="true"]')) ||
      Boolean(target.closest("[data-mention-list]")))
  );
}

interface UsePersonNotesEditorOptions {
  contact: Contact | null;
  mentionSuggestion: ReturnType<
    typeof import("../editor/mentionSuggestion").createMentionSuggestion
  >;
  onSaveNotes: (field: string, value: string) => void;
  slashCommandSuggestion: ReturnType<
    typeof import("../editor/slashCommandSuggestion").createSlashCommandSuggestion
  >;
  tPersonPage: TranslateFn<"SingleContactPage">;
}

export function usePersonNotesEditor({
  contact,
  mentionSuggestion,
  slashCommandSuggestion,
  tPersonPage,
  onSaveNotes,
}: UsePersonNotesEditorOptions) {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteSaveRef = useRef<() => void>(() => {});
  const onSaveNotesRef = useRef(onSaveNotes);

  useEffect(() => {
    onSaveNotesRef.current = onSaveNotes;
  }, [onSaveNotes]);

  const editor = useEditor({
    content: contact?.notes || "",
    extensions: [
      MarkdownPasteExtension,
      StarterKit.configure({ link: false }),
      Link.configure({
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        openOnClick: true,
      }),
      Highlight,
      TextStyle,
      Color,
      TaskList,
      TaskItem.extend({
        addNodeView() {
          return ReactNodeViewRenderer(TaskItemNodeView);
        },
      }).configure({ nested: true }),
      Emoji.configure({
        enableEmoticons: true,
        suggestion: emojiSuggestionRender,
      }),
      SlashCommandExtension.configure({
        suggestion: slashCommandSuggestion,
      }),
      createPersonMentionExtension(mentionSuggestion),
      Placeholder.configure({
        placeholder: tPersonPage("NotesPlaceholder"),
      }),
      InlineDateExtension,
    ],
    immediatelyRender: false,
    onBlur: ({ editor: notesEditor, event }) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const relatedTarget = event instanceof FocusEvent ? event.relatedTarget : null;
      if (
        isNotesEditorChrome(relatedTarget) ||
        isNotesEditorChrome(window.document.activeElement)
      ) {
        return;
      }

      const html = notesEditor.getHTML();
      if (html !== contact?.notes) {
        onSaveNotesRef.current("notes", html);
      }
    },
    onUpdate: ({ editor: notesEditor }) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        onSaveNotesRef.current("notes", notesEditor.getHTML());
      }, 1500);
    },
  });

  useEffect(() => {
    if (!editor || contact?.notes === undefined) {
      return;
    }
    const incoming = contact.notes || "";
    if (editor.getHTML() === incoming) {
      return;
    }
    editor.commands.setContent(incoming);
  }, [contact?.notes, editor]);

  noteSaveRef.current = () => {
    if (!editor) {
      return;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      onSaveNotesRef.current("notes", editor.getHTML());
      return;
    }
    const html = editor.getHTML();
    if (html === (contact?.notes || "")) {
      notifications.show(
        successNotificationTemplate({
          description: tPersonPage("NotesAlreadySaved"),
          title: tPersonPage("NotesSaved"),
        }),
      );
      return;
    }
    onSaveNotesRef.current("notes", html);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        noteSaveRef.current();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return { editor };
}
