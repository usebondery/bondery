import { Pressable, StyleSheet, View } from "react-native";
import type { Contact } from "@bondery/schemas";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { MentionContactListContent } from "./MentionContactListContent";
import { SlashCommandListContent } from "./SlashCommandListContent";
import type { SlashCommandDefinition } from "../slashCommands";

export type EditorPaletteMode = "closed" | "slash" | "mention";

interface EditorCommandPaletteProps {
  mode: "slash" | "mention";
  slashQuery: string;
  mentionContacts: Contact[];
  mentionLoading: boolean;
  onDismiss: () => void;
  onSlashCommandSelect: (command: SlashCommandDefinition) => void;
  onMentionSelect: (contact: Contact) => void;
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
  const accessibilityLabel =
    mode === "slash" ? "Formatting commands" : "Mention suggestions";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.border,
        },
      ]}
      accessibilityRole="menu"
      accessibilityLabel={accessibilityLabel}
    >
      <Pressable
        onPress={onDismiss}
        style={styles.handleHit}
        accessibilityRole="button"
        accessibilityLabel="Dismiss command menu"
      >
        <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
      </Pressable>

      {mode === "slash" ? (
        <SlashCommandListContent
          query={slashQuery}
          onSelect={onSlashCommandSelect}
        />
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
    borderTopWidth: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  handleHit: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});
