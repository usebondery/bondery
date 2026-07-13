import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import {
  filterSlashCommands,
  groupSlashCommands,
  type SlashCommandDefinition,
} from "../slashCommands";

interface SlashCommandListContentProps {
  onSelect: (command: SlashCommandDefinition) => void;
  query: string;
}

function SlashCommandRow({
  command,
  onPress,
}: {
  command: SlashCommandDefinition;
  onPress: () => void;
}) {
  const colors = useMobileThemeColors();
  const Icon = command.icon;

  return (
    <Pressable
      accessibilityLabel={`${command.label}, ${command.description}`}
      accessibilityRole="menuitem"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      <Icon size={20} stroke={colors.iconPrimary} />
      <View style={styles.textCol}>
        <Text numberOfLines={1} style={[styles.label, { color: colors.textPrimary }]}>
          {command.label}
        </Text>
        <Text numberOfLines={1} style={[styles.description, { color: colors.textMuted }]}>
          {command.description}
        </Text>
      </View>
    </Pressable>
  );
}

export function SlashCommandListContent({ query, onSelect }: SlashCommandListContentProps) {
  const colors = useMobileThemeColors();
  const commands = filterSlashCommands(query);
  const sections = groupSlashCommands(commands);

  if (commands.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No results</Text>
      </View>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.list}>
      {sections.map((section) => (
        <View key={section.group}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
            {section.group.toUpperCase()}
          </Text>
          {section.items.map((command) => (
            <SlashCommandRow command={command} key={command.id} onPress={() => onSelect(command)} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: 13,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  emptyText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
  },
  label: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  list: {
    maxHeight: 280,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.6,
    paddingBottom: 4,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  textCol: {
    flex: 1,
    gap: 1,
  },
});
