import {
  collapsePersonMentionsFromEditor,
  expandPersonMentionsForEditor,
  formatPersonMentionLink,
  htmlToMarkdown,
  markdownToHtml,
} from "@bondery/helpers/notes";
import type { Contact } from "@bondery/schemas";
import { contactNotesUpdateSchema } from "@bondery/schemas";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import type { EnrichedMarkdownTextInputInstance, StyleState } from "react-native-enriched-markdown";
import { EnrichedMarkdownTextInput } from "react-native-enriched-markdown";
import { StackNavBar } from "../../components/chrome";
import { updateContact } from "../../lib/domains/contacts";
import { useContact, useMyselfContact } from "../../lib/sync/hooks/useSyncQuery";
import { useAppToast } from "../../lib/toast/useAppToast";
import { MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { EditorCommandPalette, type EditorPaletteMode } from "./components/EditorCommandPalette";
import { NotesFormattingToolbar } from "./components/NotesFormattingToolbar";
import { formatContactName, formatRelativeEditedAt } from "./contactUtils";
import { useMentionableContacts } from "./hooks/useMentionableContacts";
import {
  removeSlashTokenFromMarkdown,
  useSlashCommandDetection,
} from "./hooks/useSlashCommandDetection";
import type { SlashCommandDefinition } from "./slashCommands";

interface ContactNotesEditorProps {
  id?: string;
  isMyselfMode?: boolean;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1500;

export function ContactNotesEditor({ id, isMyselfMode = false }: ContactNotesEditorProps) {
  const router = useRouter();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();

  const [contactId, setContactId] = useState<string | null>(id ?? null);
  const [contactName, setContactName] = useState<string>("");
  const [notesUpdatedAt, setNotesUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [styleState, setStyleState] = useState<StyleState | null>(null);
  const [rawMarkdown, setRawMarkdown] = useState<string | null>(null);
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [loadedContact, setLoadedContact] = useState<Contact | null>(null);

  const editorRef = useRef<EnrichedMarkdownTextInputInstance>(null);
  const pendingMarkdown = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const isTransitioningToMentionRef = useRef(false);

  const {
    loading: mentionContactsLoading,
    getContactName,
    filterContacts,
  } = useMentionableContacts({
    contactId: loadedContact?.id ?? null,
    isMyselfMode,
    subjectContact: loadedContact,
  });

  const { slashState, handleChangeText, handleChangeSelection, clearSlash } =
    useSlashCommandDetection();

  const paletteMode: EditorPaletteMode = mentionActive
    ? "mention"
    : slashState?.isActive
      ? "slash"
      : "closed";

  const mentionResults = useMemo(
    () => filterContacts(mentionQuery),
    [filterContacts, mentionQuery],
  );

  const getContactNameForEditor = useCallback(
    (personId: string) => {
      if (loadedContact && personId === loadedContact.id) {
        return formatContactName(loadedContact);
      }
      return getContactName(personId);
    },
    [getContactName, loadedContact],
  );

  const editorDefaultValue = useMemo(() => {
    if (rawMarkdown === null) {
      return "";
    }

    return expandPersonMentionsForEditor(rawMarkdown, getContactNameForEditor);
  }, [rawMarkdown, getContactNameForEditor]);

  const { data: fetchedContact } = useContact(isMyselfMode ? undefined : id);
  const { data: fetchedMyself } = useMyselfContact();
  const resolvedContact = isMyselfMode ? fetchedMyself : fetchedContact;

  useEffect(() => {
    if (!resolvedContact) {
      if (!isMyselfMode && !id) {
        showToast({ headline: "Failed to load notes", type: "error" });
        setLoading(false);
      }
      return;
    }

    setContactId(resolvedContact.id);
    setContactName(formatContactName(resolvedContact));
    setLoadedContact(resolvedContact);
    setNotesUpdatedAt(resolvedContact.notesUpdatedAt ?? null);
    setRawMarkdown(htmlToMarkdown(resolvedContact.notes ?? ""));
    setLoading(false);
  }, [id, isMyselfMode, resolvedContact, showToast]);

  const saveNotes = useCallback(
    async (markdown: string) => {
      if (!contactId || isSavingRef.current) {
        return;
      }
      isSavingRef.current = true;
      setSaveStatus("saving");
      try {
        const collapsed = collapsePersonMentionsFromEditor(markdown);
        const html = markdownToHtml(collapsed) || null;
        const payload = contactNotesUpdateSchema.parse({ notes: html });
        const updated = updateContact(contactId, payload);
        setNotesUpdatedAt(updated.notesUpdatedAt ?? null);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
        showToast({ headline: "Failed to save notes", type: "error" });
      } finally {
        isSavingRef.current = false;
      }
    },
    [contactId, showToast],
  );

  const scheduleAutosave = useCallback(
    (markdown: string) => {
      pendingMarkdown.current = markdown;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      setSaveStatus("idle");
      saveTimer.current = setTimeout(() => {
        if (pendingMarkdown.current !== null) {
          void saveNotes(pendingMarkdown.current);
          pendingMarkdown.current = null;
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [saveNotes],
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (saveTimer.current) {
          clearTimeout(saveTimer.current);
          saveTimer.current = null;
        }
        if (pendingMarkdown.current !== null) {
          void saveNotes(pendingMarkdown.current);
          pendingMarkdown.current = null;
        }
      };
    }, [saveNotes]),
  );

  const dismissPalette = useCallback(() => {
    clearSlash();
    setMentionActive(false);
    setMentionQuery("");
  }, [clearSlash]);

  const removeActiveSlashToken = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || !slashState) {
      return;
    }

    const markdown = await editor.getMarkdown();
    const withoutSlash = removeSlashTokenFromMarkdown(markdown, slashState.query);
    if (withoutSlash !== markdown) {
      editor.setValue(withoutSlash);
    }
  }, [slashState]);

  const handleSlashCommandSelect = useCallback(
    async (command: SlashCommandDefinition) => {
      const editor = editorRef.current;
      if (!editor || !slashState) {
        return;
      }

      await removeActiveSlashToken();

      if (command.id === "mention") {
        isTransitioningToMentionRef.current = true;
        clearSlash();
        editor.startMention("@");
        setMentionActive(true);
        setMentionQuery("");
        return;
      }

      clearSlash();
      command.run(editor);
    },
    [clearSlash, removeActiveSlashToken, slashState],
  );

  const handleMentionSelect = useCallback((contact: Contact) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const { displayText, url } = formatPersonMentionLink(formatContactName(contact), contact.id);
    editor.insertMention(displayText, url);
  }, []);

  const handleStartMention = useCallback(() => {
    clearSlash();
    setMentionActive(true);
    setMentionQuery("");
  }, [clearSlash]);

  const handleChangeMention = useCallback(({ text }: { text: string }) => {
    setMentionQuery(text);
  }, []);

  const handleEndMention = useCallback(() => {
    if (isTransitioningToMentionRef.current) {
      isTransitioningToMentionRef.current = false;
      return;
    }

    setMentionActive(false);
    setMentionQuery("");
  }, []);

  const navSubtitle = useMemo(() => {
    if (saveStatus === "saving") {
      return "Saving…";
    }
    if (saveStatus === "error") {
      return "Save failed";
    }
    if (notesUpdatedAt) {
      return formatRelativeEditedAt(notesUpdatedAt);
    }
    return undefined;
  }, [saveStatus, notesUpdatedAt]);

  const markdownStyle = useMemo(
    () => ({
      code: { backgroundColor: colors.surfacePressed },
      em: { color: colors.textPrimary },
      link: { color: colors.primary },
      linkVariants: {
        "^bp://person/": {
          backgroundColor: `${colors.primary}18`,
          color: colors.primary,
          underline: false,
        },
      },
      list: { color: colors.textPrimary, fontSize: 16 },
      paragraph: { color: colors.textPrimary, fontSize: 16, lineHeight: 24 },
      strong: { color: colors.textPrimary },
    }),
    [colors],
  );

  const showEditor = !loading && rawMarkdown !== null;

  const titleRow = (
    <View style={styles.titleCol}>
      <Text numberOfLines={1} style={[styles.navTitle, { color: colors.textPrimary }]}>
        {contactName || "Notes"}
      </Text>
      {navSubtitle ? (
        <Text
          numberOfLines={1}
          style={[
            styles.navSubtitle,
            {
              color: saveStatus === "error" ? colors.dangerText : colors.textMuted,
            },
          ]}
        >
          {navSubtitle}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <StackNavBar onBack={() => router.back()} titleRow={titleRow} />

      {showEditor ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <EnrichedMarkdownTextInput
            autoFocus
            cursorColor={colors.primary}
            defaultValue={editorDefaultValue}
            markdownStyle={markdownStyle}
            mentionIndicators={["@"]}
            multiline
            onChangeMarkdown={scheduleAutosave}
            onChangeMention={handleChangeMention}
            onChangeSelection={handleChangeSelection}
            onChangeState={setStyleState}
            onChangeText={handleChangeText}
            onEndMention={handleEndMention}
            onStartMention={handleStartMention}
            placeholder="Write notes…"
            placeholderTextColor={colors.textMuted}
            ref={editorRef}
            scrollEnabled
            selectionColor={`${colors.primary}44`}
            style={[styles.editor, { color: colors.textPrimary }]}
          />
          {paletteMode !== "closed" ? (
            <EditorCommandPalette
              mentionContacts={mentionResults}
              mentionLoading={mentionContactsLoading}
              mode={paletteMode}
              onDismiss={dismissPalette}
              onMentionSelect={handleMentionSelect}
              onSlashCommandSelect={(command) => {
                void handleSlashCommandSelect(command);
              }}
              slashQuery={slashState?.query ?? ""}
            />
          ) : (
            <NotesFormattingToolbar editorRef={editorRef} styleState={styleState} />
          )}
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  flex: {
    flex: 1,
  },
  navSubtitle: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    textAlign: "center",
  },
  navTitle: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
    textAlign: "center",
  },
  screen: {
    flex: 1,
  },
  titleCol: {
    alignItems: "center",
    gap: 1,
    justifyContent: "center",
  },
});
