import { ActionIcon, Group, Loader, Stack, Text, Textarea, Tooltip } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { successNotificationTemplate } from "@bondery/mantine-next";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditorState, type Editor } from "@tiptap/react";
import { IconChecklist, IconCode, IconCopy, IconMarkdown } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { InsertLinkControl } from "./InsertLinkControl";
import { htmlToMarkdown } from "./htmlToMarkdown";
import { markdownToHtml } from "./markdownToHtml";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

interface ContactNotesSectionProps {
  editor: Editor | null;
  savingField: string | null;
  notesUpdatedAt?: string | null;
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
      <Text size="xs" fw={600} lh={1.3}>
        {label}
      </Text>
      <Text size="xs" c="dimmed" lh={1.3}>
        {hint}
      </Text>
    </Stack>
  ) : (
    label
  );

  return (
    <Tooltip label={tooltipLabel} withinPortal openDelay={400}>
      {children}
    </Tooltip>
  );
}

export function ContactNotesSection({
  editor,
  savingField,
  notesUpdatedAt,
}: ContactNotesSectionProps) {
  const t = useTranslations("SingleContactPage");
  const tNotes = useTranslations("NotesEditor");
  const formatter = useFormatter();
  const [mode, setMode] = useState<"editor" | "source" | "markdown">("editor");
  const [editableText, setEditableText] = useState("");
  const clipboard = useClipboard({ timeout: 2000 });

  const applyAndSync = (text: string, fromMode: "source" | "markdown") => {
    if (!editor) return;
    const html = fromMode === "source" ? text : markdownToHtml(text);
    editor.commands.setContent(html);
  };

  const handleModeToggle = (target: "source" | "markdown") => {
    if (!editor) return;
    const nextMode = mode === target ? "editor" : target;
    // Flush current textarea edits back to the editor
    if (mode === "source") applyAndSync(editableText, "source");
    else if (mode === "markdown") applyAndSync(editableText, "markdown");
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
    if (!editor || mode === "editor") return;
    applyAndSync(editableText, mode as "source" | "markdown");
  };

  // Subscribe to editor state so toolbar active-states stay in sync with keyboard shortcuts
  const _editorState = useEditorState({
    editor,
    selector: ({ editor: ed }) => ed?.state ?? null,
  });
  const taskListActive =
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
      <Group gap="xs" mb="xs" align="center">
        <Text size="sm" fw={600}>
          {tNotes("NotesTitle")}
        </Text>
        {savingField === "notes" && <Loader size="xs" />}
        {notesUpdatedAt && savingField !== "notes" && (
          <Text size="xs" c="dimmed">
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
          <Group justify="space-between" align="center" wrap="nowrap" w="100%">
            <Group gap="xs" wrap="wrap">
              {mode === "editor" && (
                <>
                  <RichTextEditor.ControlsGroup>
                    <T label={tNotes("Bold")} hint={tNotes("BoldHint")}>
                      <RichTextEditor.Bold />
                    </T>
                    <T label={tNotes("Italic")} hint={tNotes("ItalicHint")}>
                      <RichTextEditor.Italic />
                    </T>
                    <T label={tNotes("Underline")} hint={tNotes("UnderlineHint")}>
                      <RichTextEditor.Underline />
                    </T>
                    <T label={tNotes("Strikethrough")} hint={tNotes("StrikethroughHint")}>
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
                    <T label={tNotes("Highlight")} hint={tNotes("HighlightHint")}>
                      <RichTextEditor.Highlight />
                    </T>
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <T label={tNotes("Heading1")} hint={tNotes("Heading1Hint")}>
                      <RichTextEditor.H1 />
                    </T>
                    <T label={tNotes("Heading2")} hint={tNotes("Heading2Hint")}>
                      <RichTextEditor.H2 />
                    </T>
                    <T label={tNotes("Heading3")} hint={tNotes("Heading3Hint")}>
                      <RichTextEditor.H3 />
                    </T>
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <T label={tNotes("Blockquote")} hint={tNotes("BlockquoteHint")}>
                      <RichTextEditor.Blockquote />
                    </T>
                    <T label={tNotes("Divider")} hint={tNotes("DividerHint")}>
                      <RichTextEditor.Hr />
                    </T>
                    <T label={tNotes("BulletList")} hint={tNotes("BulletListHint")}>
                      <RichTextEditor.BulletList />
                    </T>
                    <T label={tNotes("OrderedList")} hint={tNotes("OrderedListHint")}>
                      <RichTextEditor.OrderedList />
                    </T>
                    <T label={tNotes("TodoList")} hint={tNotes("TodoListHint")}>
                      <RichTextEditor.Control
                        aria-label={tNotes("ToggleTodoList")}
                        onClick={handleToggleTaskList}
                        active={editor?.isActive("taskList")}
                      >
                        <IconChecklist size={16} stroke={1.5} />
                      </RichTextEditor.Control>
                    </T>
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <InsertLinkControl />
                    <T label={tNotes("RemoveLink")} hint={tNotes("RemoveLinkHint")}>
                      <RichTextEditor.Unlink />
                    </T>
                  </RichTextEditor.ControlsGroup>
                </>
              )}
            </Group>

            <RichTextEditor.ControlsGroup>
              <T label={tNotes("Undo")} hint={tNotes("UndoHint")}>
                <RichTextEditor.Undo />
              </T>
              <T label={tNotes("Redo")} hint={tNotes("RedoHint")}>
                <RichTextEditor.Redo />
              </T>
              <T label={tNotes("SourceCode")}>
                <RichTextEditor.Control
                  aria-label={tNotes("ToggleSourceCode")}
                  onClick={() => handleModeToggle("source")}
                  active={mode === "source"}
                >
                  <IconCode size={16} stroke={1.5} />
                </RichTextEditor.Control>
              </T>
              <T label={tNotes("Markdown")}>
                <RichTextEditor.Control
                  aria-label={tNotes("ToggleMarkdown")}
                  onClick={() => handleModeToggle("markdown")}
                  active={mode === "markdown"}
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
            <Group justify="flex-end" px="md" pt="xs">
              <Tooltip
                label={mode === "markdown" ? tNotes("CopyMarkdown") : tNotes("CopyHtml")}
                openDelay={400}
                withinPortal
              >
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onClick={() => {
                    clipboard.copy(editableText);
                    notifications.show(
                      successNotificationTemplate({
                        title: tNotes("CopiedTitle"),
                        description:
                          mode === "markdown"
                            ? tNotes("CopiedMarkdown")
                            : tNotes("CopiedHtml"),
                      }),
                    );
                  }}
                  aria-label={tNotes("CopyAction")}
                >
                  <IconCopy size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Textarea
              value={editableText}
              onChange={(e) => setEditableText(e.currentTarget.value)}
              onBlur={handleTextareaBlur}
              autosize
              minRows={6}
              variant="unstyled"
              p="md"
              style={{
                fontFamily: mode === "source" ? "monospace" : undefined,
              }}
            />
          </>
        )}
      </RichTextEditor>
    </div>
  );
}
