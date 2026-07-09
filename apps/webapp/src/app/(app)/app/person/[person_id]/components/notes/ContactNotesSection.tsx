import { successNotificationTemplate } from "@bondery/mantine-next";
import { ActionIcon, Group, Loader, Stack, Text, Textarea, Tooltip } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { RichTextEditor } from "@mantine/tiptap";
import { IconChecklist, IconCode, IconCopy, IconMarkdown } from "@tabler/icons-react";
import { type Editor, useEditorState } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { formatRelativeTime } from "@/lib/i18n/formatRelativeTime";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { htmlToMarkdown } from "../../editor/htmlToMarkdown";
import { markdownToHtml } from "../../editor/markdownToHtml";
import { InsertLinkControl } from "./InsertLinkControl";

interface ContactNotesSectionProps {
  editor: Editor | null;
  notesUpdatedAt?: string | null;
  savingField: string | null;
}

/**
 * Wraps a toolbar control in a Mantine Tooltip.
 * When `hint` is provided it renders as a two-line label:
 *   Line 1 — action name (bold)
 *   Line 2 — shortcut / markdown hint (dimmed, smaller)
 */
function T({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const tooltipLabel = hint ? (
    <Stack gap={2}>
      <Text fw={600} lh={1.3} size="xs">
        {label}
      </Text>
      <Text c="dimmed" lh={1.3} size="xs">
        {hint}
      </Text>
    </Stack>
  ) : (
    label
  );

  return (
    <Tooltip label={tooltipLabel} openDelay={400} withinPortal>
      {children}
    </Tooltip>
  );
}

export function ContactNotesSection({
  editor,
  savingField,
  notesUpdatedAt,
}: ContactNotesSectionProps) {
  const t = useWebTranslations("SingleContactPage");
  const tNotes = useWebTranslations("NotesEditor");
  const formatter = useFormatter();
  const [mode, setMode] = useState<"editor" | "source" | "markdown">("editor");
  const [editableText, setEditableText] = useState("");
  const clipboard = useClipboard({ timeout: 2000 });

  const applyAndSync = (text: string, fromMode: "source" | "markdown") => {
    if (!editor) {
      return;
    }
    const html = fromMode === "source" ? text : markdownToHtml(text);
    editor.commands.setContent(html);
  };

  const handleModeToggle = (target: "source" | "markdown") => {
    if (!editor) {
      return;
    }
    const nextMode = mode === target ? "editor" : target;
    // Flush current textarea edits back to the editor
    if (mode === "source") {
      applyAndSync(editableText, "source");
    } else if (mode === "markdown") {
      applyAndSync(editableText, "markdown");
    }
    // Populate textarea for incoming mode
    if (nextMode === "source") {
      setEditableText(editor.getHTML());
    } else if (nextMode === "markdown") {
      setEditableText(htmlToMarkdown(editor.getHTML()));
    } else {
      // Returning to rich editor — restore focus so blur-save works normally
      setTimeout(() => editor.commands.focus(), 0);
    }
    setMode(nextMode);
  };

  // Always-fresh ref for handleModeToggle so the Cmd+/ listener never goes stale
  const handleModeToggleRef = useRef(handleModeToggle);
  handleModeToggleRef.current = handleModeToggle;

  // Cmd+/ — toggle markdown mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        handleModeToggleRef.current("markdown");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleTextareaBlur = () => {
    if (!editor || mode === "editor") {
      return;
    }
    applyAndSync(editableText, mode as "source" | "markdown");
  };

  // Subscribe to editor state so toolbar active-states stay in sync with keyboard shortcuts
  const _editorState = useEditorState({
    editor,
    selector: ({ editor: ed }) => ed?.state ?? null,
  });
  const _taskListActive =
    useEditorState({
      editor,
      selector: ({ editor: ed }) => ed?.isActive("taskList") ?? false,
    }) ?? false;

  const handleToggleTaskList = () => {
    if (!editor) {
      return;
    }

    editor.chain().focus().toggleTaskList().run();
  };

  return (
    <div>
      <Group align="center" gap="xs" mb="xs">
        <Text fw={600} size="sm">
          {tNotes("NotesTitle")}
        </Text>
        {savingField === "notes" && <Loader size="xs" />}
        {notesUpdatedAt && savingField !== "notes" && (
          <Text c="dimmed" size="xs">
            {t("NotesEditedAt", {
              time: formatRelativeTime(new Date(notesUpdatedAt), formatter, t("lessThanMinuteAgo")),
            })}
          </Text>
        )}
      </Group>
      <RichTextEditor editor={editor}>
        <RichTextEditor.Toolbar
          data-notes-editor-toolbar="true"
          sticky
          stickyOffset={0}
          style={{ backgroundColor: "var(--mantine-color-body)", zIndex: 10 }}
        >
          <Group align="center" justify="space-between" w="100%" wrap="nowrap">
            <Group gap="xs" wrap="wrap">
              {mode === "editor" && (
                <>
                  <RichTextEditor.ControlsGroup>
                    <T hint={tNotes("BoldHint")} label={tNotes("Bold")}>
                      <RichTextEditor.Bold />
                    </T>
                    <T hint={tNotes("ItalicHint")} label={tNotes("Italic")}>
                      <RichTextEditor.Italic />
                    </T>
                    <T hint={tNotes("UnderlineHint")} label={tNotes("Underline")}>
                      <RichTextEditor.Underline />
                    </T>
                    <T hint={tNotes("StrikethroughHint")} label={tNotes("Strikethrough")}>
                      <RichTextEditor.Strikethrough />
                    </T>
                    <T label={tNotes("ClearFormatting")}>
                      <RichTextEditor.ClearFormatting />
                    </T>
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <T label={tNotes("TextColor")}>
                      <RichTextEditor.ColorPicker
                        colors={[
                          "#25262b",
                          "#868e96",
                          "#fa5252",
                          "#e64980",
                          "#be4bdb",
                          "#7950f2",
                          "#4c6ef5",
                          "#228be6",
                          "#15aabf",
                          "#12b886",
                          "#40c057",
                          "#82c91e",
                          "#fab005",
                          "#fd7e14",
                        ]}
                      />
                    </T>
                    <T label={tNotes("UnsetColor")}>
                      <RichTextEditor.UnsetColor />
                    </T>
                    <T hint={tNotes("HighlightHint")} label={tNotes("Highlight")}>
                      <RichTextEditor.Highlight />
                    </T>
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <T hint={tNotes("Heading1Hint")} label={tNotes("Heading1")}>
                      <RichTextEditor.H1 />
                    </T>
                    <T hint={tNotes("Heading2Hint")} label={tNotes("Heading2")}>
                      <RichTextEditor.H2 />
                    </T>
                    <T hint={tNotes("Heading3Hint")} label={tNotes("Heading3")}>
                      <RichTextEditor.H3 />
                    </T>
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <T hint={tNotes("BlockquoteHint")} label={tNotes("Blockquote")}>
                      <RichTextEditor.Blockquote />
                    </T>
                    <T hint={tNotes("DividerHint")} label={tNotes("Divider")}>
                      <RichTextEditor.Hr />
                    </T>
                    <T hint={tNotes("BulletListHint")} label={tNotes("BulletList")}>
                      <RichTextEditor.BulletList />
                    </T>
                    <T hint={tNotes("OrderedListHint")} label={tNotes("OrderedList")}>
                      <RichTextEditor.OrderedList />
                    </T>
                    <T hint={tNotes("TodoListHint")} label={tNotes("TodoList")}>
                      <RichTextEditor.Control
                        active={editor?.isActive("taskList")}
                        aria-label={tNotes("ToggleTodoList")}
                        onClick={handleToggleTaskList}
                      >
                        <IconChecklist size={16} stroke={1.5} />
                      </RichTextEditor.Control>
                    </T>
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <InsertLinkControl />
                    <T hint={tNotes("RemoveLinkHint")} label={tNotes("RemoveLink")}>
                      <RichTextEditor.Unlink />
                    </T>
                  </RichTextEditor.ControlsGroup>
                </>
              )}
            </Group>

            <RichTextEditor.ControlsGroup>
              <T hint={tNotes("UndoHint")} label={tNotes("Undo")}>
                <RichTextEditor.Undo />
              </T>
              <T hint={tNotes("RedoHint")} label={tNotes("Redo")}>
                <RichTextEditor.Redo />
              </T>
              <T label={tNotes("SourceCode")}>
                <RichTextEditor.Control
                  active={mode === "source"}
                  aria-label={tNotes("ToggleSourceCode")}
                  onClick={() => handleModeToggle("source")}
                >
                  <IconCode size={16} stroke={1.5} />
                </RichTextEditor.Control>
              </T>
              <T label={tNotes("Markdown")}>
                <RichTextEditor.Control
                  active={mode === "markdown"}
                  aria-label={tNotes("ToggleMarkdown")}
                  onClick={() => handleModeToggle("markdown")}
                >
                  <IconMarkdown size={16} stroke={1.5} />
                </RichTextEditor.Control>
              </T>
            </RichTextEditor.ControlsGroup>
          </Group>
        </RichTextEditor.Toolbar>

        <div style={{ display: mode === "editor" ? undefined : "none" }}>
          <RichTextEditor.Content />
        </div>

        {mode !== "editor" && (
          <>
            <Group justify="flex-end" pt="xs" px="md">
              <Tooltip
                label={mode === "markdown" ? tNotes("CopyMarkdown") : tNotes("CopyHtml")}
                openDelay={400}
                withinPortal
              >
                <ActionIcon
                  aria-label={tNotes("CopyAction")}
                  color="gray"
                  onClick={() => {
                    clipboard.copy(editableText);
                    notifications.show(
                      successNotificationTemplate({
                        description:
                          mode === "markdown" ? tNotes("CopiedMarkdown") : tNotes("CopiedHtml"),
                        title: tNotes("CopiedTitle"),
                      }),
                    );
                  }}
                  size="sm"
                  variant="subtle"
                >
                  <IconCopy size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Textarea
              autosize
              minRows={6}
              onBlur={handleTextareaBlur}
              onChange={(e) => setEditableText(e.currentTarget.value)}
              p="md"
              style={{
                fontFamily: mode === "source" ? "monospace" : undefined,
              }}
              value={editableText}
              variant="unstyled"
            />
          </>
        )}
      </RichTextEditor>
    </div>
  );
}
