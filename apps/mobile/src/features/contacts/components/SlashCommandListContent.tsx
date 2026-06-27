import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import {
  filterSlashCommands,
  groupSlashCommands,
  type SlashCommandDefinition,
} from "../slashCommands";

interface SlashCommandListContentProps {
  query: string;
  onSelect: (command: SlashCommandDefinition) => void;
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
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.surfacePressed },
      ]}
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityLabel={`${command.label}, ${command.description}`}
    >
      <Icon size={20} stroke={colors.iconPrimary} />
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
          {command.label}
        </Text>
        <Text
          style={[styles.description, { color: colors.textMuted }]}
          numberOfLines={1}
        >
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
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No results
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.list}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      {sections.map((section) => (
        <View key={section.group}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
            {section.group.toUpperCase()}
          </Text>
          {section.items.map((command) => (
            <SlashCommandRow
              key={command.id}
              command={command}
              onPress={() => onSelect(command)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 280,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    paddingHorizontal: 12,
    gap: 12,
  },
  textCol: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  description: {
    fontSize: 13,
  },
  empty: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
  },
});
