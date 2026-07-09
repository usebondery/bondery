import { parsePersonMentionUrl } from "@bondery/helpers/notes";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import { NOTES_COLLAPSE_CHAR_THRESHOLD } from "../../../lib/config";
import { useAppToast } from "../../../lib/toast/useAppToast";
import type { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { contactDetailScreenStyles as styles } from "./contactDetailScreenStyles";
import { contactDetailStyles } from "./contactDetailStyles";

interface ContactDetailNotesSectionProps {
  colors: ReturnType<typeof useMobileThemeColors>;
  mentionableContactIds: Set<string>;
  myselfContactId: string | null | undefined;
  notesMarkdown: string;
  onOpenNotesEditor: () => void;
}

export function ContactDetailNotesSection({
  colors,
  mentionableContactIds,
  myselfContactId,
  notesMarkdown,
  onOpenNotesEditor,
}: ContactDetailNotesSectionProps) {
  const router = useRouter();
  const { showToast } = useAppToast();
  const [notesExpanded, setNotesExpanded] = useState(false);
  const longNotes = notesMarkdown.length > NOTES_COLLAPSE_CHAR_THRESHOLD;

  const handleMentionLinkPress = useCallback(
    ({ url }: { url: string }) => {
      const personId = parsePersonMentionUrl(url);
      if (!personId) {
        return;
      }

      if (!mentionableContactIds.has(personId)) {
        showToast({ headline: "Contact no longer available", type: "error" });
        return;
      }

      if (myselfContactId && personId === myselfContactId) {
        router.push("/myself");
        return;
      }

      router.push(`/contact/${personId}`);
    },
    [mentionableContactIds, myselfContactId, router, showToast],
  );

  return (
    <View style={contactDetailStyles.section}>
      <ContactDetailSectionHeader title="Notes" />
      <Pressable
        accessibilityLabel={notesMarkdown ? "Edit notes" : "Add notes"}
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
        {notesMarkdown ? (
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
                onPress={(e) => {
                  e.stopPropagation?.();
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
