import { View } from "react-native";
import { EmojiBadge } from "../EmojiBadge";
import { Text } from "../Text";
import { ThemeIcon } from "../ThemeIcon";
import type { SelectLeftSection } from "./types";

type SelectLeftSectionViewProps = {
  section: SelectLeftSection;
};

export function SelectLeftSectionView({ section }: SelectLeftSectionViewProps) {
  switch (section.type) {
    case "icon":
      return <View className="min-w-5 items-center justify-center">{section.icon}</View>;
    case "emoji":
      return (
        <ThemeIcon shape="rounded" size="sm" variant="light">
          <Text className="text-lg leading-7" size={null}>
            {section.emoji}
          </Text>
        </ThemeIcon>
      );
    case "emojiBadge":
      return (
        <EmojiBadge backgroundColor={section.backgroundColor} emoji={section.emoji} size="sm" />
      );
    default:
      return null;
  }
}
