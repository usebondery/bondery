import { parsePersonMentionUrl } from "@bondery/helpers/notes";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react-native";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import { Pressable } from "@/components/ui/Pressable";
import { NOTES_COLLAPSE_CHAR_THRESHOLD } from "../../../lib/config";
import { useAppNavigation } from "../../../lib/navigation/useAppNavigation";
import { notifications } from "../../../lib/toast/notifications";
import type { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { contactDetailScreenStyles as styles } from "./contactDetailScreenStyles";
import { contactDetailStyles } from "./contactDetailStyles";

interface ContactDetailNotesSectionProps {
  colors: ReturnType<typeof useMobileThemeColors>;
  mentionableContactIds: ReadonlySet<string>;
  myselfContactId: string | null | undefined;
  notesMarkdown: string;
  notesPending?: boolean;
  onOpenNotesEditor: () => void;
}

export function ContactDetailNotesSection({
  colors,
  mentionableContactIds,
  myselfContactId,
  notesMarkdown,
  notesPending = false,
  onOpenNotesEditor,
}: ContactDetailNotesSectionProps) {
  const { openContact, openMyself } = useAppNavigation();
  const [notesExpanded, setNotesExpanded] = useState(false);
  const longNotes = notesMarkdown.length > NOTES_COLLAPSE_CHAR_THRESHOLD;

  function handleMentionLinkPress({ url }: { url: string }) {
    const personId = parsePersonMentionUrl(url);
    if (!personId) {
      return;
    }

    if (!mentionableContactIds.has(personId)) {
      notifications.show({ title: "Contact no longer available", type: "error" });
      return;
    }

    if (myselfContactId && personId === myselfContactId) {
      openMyself();
      return;
    }

    openContact(personId);
  }

  return (
    <View style={contactDetailStyles.section}>
      <ContactDetailSectionHeader title="Notes" />
      <Pressable
        accessibilityLabel={notesPending || notesMarkdown ? "Edit notes" : "Add notes"}
        accessibilityRole="button"
        onPress={onOpenNotesEditor}
        style={[
          contactDetailStyles.card,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
          },
        ]}
      >
        {notesPending ? (
          <ActivityIndicator color={colors.textMuted} size="small" />
        ) : notesMarkdown ? (
          <>
            <View style={notesExpanded ? undefined : styles.notesCollapsed}>
              <EnrichedMarkdownText
                flavor="github"
                markdown={notesMarkdown}
                markdownStyle={{
                  blockquote: { borderColor: colors.border },
                  code: { backgroundColor: colors.surfacePressed },
                  h1: { color: colors.textPrimary },
                  h2: { color: colors.textPrimary },
                  h3: { color: colors.textPrimary },
                  link: { color: colors.primary },
                  linkVariants: {
                    "^bp://person/": {
                      backgroundColor: `${colors.primary}18`,
                      color: colors.primary,
                      underline: false,
                    },
                  },
                  list: { color: colors.textSecondary, fontSize: 15 },
                  paragraph: {
                    color: colors.textSecondary,
                    fontSize: 15,
                    lineHeight: 22,
                    marginBottom: 4,
                  },
                }}
                onLinkPress={handleMentionLinkPress}
              />
            </View>
            {longNotes ? (
              <Pressable
                accessibilityLabel={notesExpanded ? "Show less notes" : "Show more notes"}
                accessibilityRole="button"
                onPress={() => {
                  setNotesExpanded((v) => !v);
                }}
                style={styles.showMoreButton}
              >
                {notesExpanded ? (
                  <IconChevronUp size={14} stroke={colors.iconSecondary} />
                ) : (
                  <IconChevronDown size={14} stroke={colors.iconSecondary} />
                )}
                <Text style={[styles.showMoreText, { color: colors.textMuted }]}>
                  {notesExpanded ? "Show less" : "Show more"}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Text style={[styles.notesPlaceholder, { color: colors.textMuted }]}>Add notes…</Text>
        )}
      </Pressable>
    </View>
  );
}
