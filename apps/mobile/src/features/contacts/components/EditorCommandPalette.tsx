import type { Contact } from "@bondery/schemas";
import { Pressable, StyleSheet, View } from "react-native";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import type { SlashCommandDefinition } from "../slashCommands";
import { MentionContactListContent } from "./MentionContactListContent";
import { SlashCommandListContent } from "./SlashCommandListContent";

export type EditorPaletteMode = "closed" | "slash" | "mention";

interface EditorCommandPaletteProps {
  mentionContacts: Contact[];
  mentionLoading: boolean;
  mode: "slash" | "mention";
  onDismiss: () => void;
  onMentionSelect: (contact: Contact) => void;
  onSlashCommandSelect: (command: SlashCommandDefinition) => void;
  slashQuery: string;
}

export function EditorCommandPalette({
  mode,
  slashQuery,
  mentionContacts,
  mentionLoading,
  onDismiss,
  onSlashCommandSelect,
  onMentionSelect,
}: EditorCommandPaletteProps) {
  const colors = useMobileThemeColors();
  const accessibilityLabel = mode === "slash" ? "Formatting commands" : "Mention suggestions";

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="menu"
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityLabel="Dismiss command menu"
        accessibilityRole="button"
        onPress={onDismiss}
        style={styles.handleHit}
      >
        <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
      </Pressable>

      {mode === "slash" ? (
        <SlashCommandListContent onSelect={onSlashCommandSelect} query={slashQuery} />
      ) : (
        <MentionContactListContent
          contacts={mentionContacts}
          loading={mentionLoading}
          onSelect={onMentionSelect}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1,
  },
  handle: {
    borderRadius: 2,
    height: 4,
    width: 36,
  },
  handleHit: {
    alignItems: "center",
    paddingBottom: 4,
    paddingTop: 8,
  },
});
