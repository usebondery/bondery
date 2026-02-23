import { Group, Loader, Text } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import type { Editor } from "@tiptap/react";
import { useState } from "react";

interface ContactNotesSectionProps {
  editor: Editor | null;
  savingField: string | null;
}

export function ContactNotesSection({ editor, savingField }: ContactNotesSectionProps) {
  const [isSourceCodeModeActive, setIsSourceCodeModeActive] = useState(false);

  return (
    <div>
      <Group gap="xs" mb="xs" align="center">
        <Text size="sm" fw={600}>
          Notes
        </Text>
        {savingField === "notes" && <Loader size="xs" />}
      </Group>
      <RichTextEditor editor={editor} onSourceCodeTextSwitch={setIsSourceCodeModeActive}>
        <RichTextEditor.Toolbar data-notes-editor-toolbar="true" sticky stickyOffset={60}>
          <Group justify="space-between" align="center" wrap="nowrap" w="100%">
            <Group gap="xs" wrap="wrap">
              {!isSourceCodeModeActive && (
                <>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Bold />
                    <RichTextEditor.Italic />
                    <RichTextEditor.Underline />
                    <RichTextEditor.Strikethrough />
                    <RichTextEditor.ClearFormatting />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
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
                    <RichTextEditor.UnsetColor />
                    <RichTextEditor.Highlight />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.H1 />
                    <RichTextEditor.H2 />
                    <RichTextEditor.H3 />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Blockquote />
                    <RichTextEditor.Hr />
                    <RichTextEditor.BulletList />
                    <RichTextEditor.OrderedList />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Link />
                    <RichTextEditor.Unlink />
                  </RichTextEditor.ControlsGroup>
                </>
              )}
            </Group>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Undo />
              <RichTextEditor.Redo />
              <RichTextEditor.SourceCode />
            </RichTextEditor.ControlsGroup>
          </Group>
        </RichTextEditor.Toolbar>

        <RichTextEditor.Content />
      </RichTextEditor>
    </div>
  );
}
