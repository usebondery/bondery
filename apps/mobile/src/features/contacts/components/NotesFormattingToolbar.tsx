import { IconBold, IconItalic, IconStrikethrough, IconUnderline } from "@tabler/icons-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { EnrichedMarkdownTextInputInstance, StyleState } from "react-native-enriched-markdown";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface NotesFormattingToolbarProps {
  editorRef: React.RefObject<EnrichedMarkdownTextInputInstance | null>;
  styleState: StyleState | null;
}

export function NotesFormattingToolbar({ editorRef, styleState }: NotesFormattingToolbarProps) {
  const colors = useMobileThemeColors();

  function ToolbarButton({
    icon,
    isActive,
    onPress,
    accessibilityLabel,
  }: {
    icon: React.ReactNode;
    isActive?: boolean;
    onPress: () => void;
    accessibilityLabel: string;
  }) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        onPress={onPress}
        style={[styles.button, isActive && { backgroundColor: `${colors.primary}22` }]}
      >
        {icon}
      </Pressable>
    );
  }

  const iconColor = (active?: boolean) => (active ? colors.primary : colors.iconPrimary);
  const iconSize = 20;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.row}
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
      >
        <ToolbarButton
          accessibilityLabel="Bold"
          icon={<IconBold size={iconSize} stroke={iconColor(styleState?.bold.isActive)} />}
          isActive={styleState?.bold.isActive}
          onPress={() => editorRef.current?.toggleBold()}
        />
        <ToolbarButton
          accessibilityLabel="Italic"
          icon={<IconItalic size={iconSize} stroke={iconColor(styleState?.italic.isActive)} />}
          isActive={styleState?.italic.isActive}
          onPress={() => editorRef.current?.toggleItalic()}
        />
        <ToolbarButton
          accessibilityLabel="Underline"
          icon={
            <IconUnderline size={iconSize} stroke={iconColor(styleState?.underline?.isActive)} />
          }
          isActive={styleState?.underline?.isActive}
          onPress={() => editorRef.current?.toggleUnderline()}
        />
        <ToolbarButton
          accessibilityLabel="Strikethrough"
          icon={
            <IconStrikethrough
              size={iconSize}
              stroke={iconColor(styleState?.strikethrough.isActive)}
            />
          }
          isActive={styleState?.strikethrough.isActive}
          onPress={() => editorRef.current?.toggleStrikethrough()}
        />
      </ScrollView>
    </View>
  );
}

const BUTTON_SIZE = MOBILE_LAYOUT.touchTarget;

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    height: BUTTON_SIZE,
    justifyContent: "center",
    width: BUTTON_SIZE,
  },
  container: {
    borderTopWidth: 1,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
