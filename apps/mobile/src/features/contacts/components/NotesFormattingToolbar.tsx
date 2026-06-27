import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconUnderline,
} from "@tabler/icons-react-native";
import type { EnrichedMarkdownTextInputInstance, StyleState } from "react-native-enriched-markdown";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface NotesFormattingToolbarProps {
  editorRef: React.RefObject<EnrichedMarkdownTextInputInstance | null>;
  styleState: StyleState | null;
}

export function NotesFormattingToolbar({
  editorRef,
  styleState,
}: NotesFormattingToolbarProps) {
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
        style={[
          styles.button,
          isActive && { backgroundColor: colors.primary + "22" },
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isActive }}
      >
        {icon}
      </Pressable>
    );
  }

  const iconColor = (active?: boolean) =>
    active ? colors.primary : colors.iconPrimary;
  const iconSize = 20;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="always"
      >
        <ToolbarButton
          icon={
            <IconBold
              size={iconSize}
              stroke={iconColor(styleState?.bold.isActive)}
            />
          }
          isActive={styleState?.bold.isActive}
          onPress={() => editorRef.current?.toggleBold()}
          accessibilityLabel="Bold"
        />
        <ToolbarButton
          icon={
            <IconItalic
              size={iconSize}
              stroke={iconColor(styleState?.italic.isActive)}
            />
          }
          isActive={styleState?.italic.isActive}
          onPress={() => editorRef.current?.toggleItalic()}
          accessibilityLabel="Italic"
        />
        <ToolbarButton
          icon={
            <IconUnderline
              size={iconSize}
              stroke={iconColor(styleState?.underline?.isActive)}
            />
          }
          isActive={styleState?.underline?.isActive}
          onPress={() => editorRef.current?.toggleUnderline()}
          accessibilityLabel="Underline"
        />
        <ToolbarButton
          icon={
            <IconStrikethrough
              size={iconSize}
              stroke={iconColor(styleState?.strikethrough.isActive)}
            />
          }
          isActive={styleState?.strikethrough.isActive}
          onPress={() => editorRef.current?.toggleStrikethrough()}
          accessibilityLabel="Strikethrough"
        />
      </ScrollView>
    </View>
  );
}

const BUTTON_SIZE = MOBILE_LAYOUT.touchTarget;

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 2,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
});
