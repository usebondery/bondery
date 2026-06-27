import { Pressable, StyleSheet, View } from "react-native";
import { IconCheck } from "@tabler/icons-react-native";
import { GROUP_COLOR_SWATCH_ROWS, COLOR_PICKER_LAYOUT } from "./constants";
import { normalizeHex } from "./colorUtils";

interface ColorSwatchGridProps {
  value: string;
  onSelect: (hex: string) => void;
}

export function ColorSwatchGrid({ value, onSelect }: ColorSwatchGridProps) {
  const selectedHex = normalizeHex(value);

  return (
    <View style={styles.grid}>
      {GROUP_COLOR_SWATCH_ROWS.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((hex) => {
            const normalized = normalizeHex(hex);
            const isSelected = selectedHex === normalized;

            return (
              <Pressable
                key={hex}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                onPress={() => onSelect(normalized)}
                style={[
                  styles.swatch,
                  { backgroundColor: hex },
                  isSelected && styles.swatchSelected,
                ]}
              >
                {isSelected ? (
                  <IconCheck size={12} color="#ffffff" strokeWidth={2.5} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: "100%",
    alignItems: "center",
    gap: COLOR_PICKER_LAYOUT.swatchGap,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: COLOR_PICKER_LAYOUT.swatchGap,
  },
  swatch: {
    width: COLOR_PICKER_LAYOUT.swatchSize,
    height: COLOR_PICKER_LAYOUT.swatchSize,
    borderRadius: COLOR_PICKER_LAYOUT.swatchSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
});
