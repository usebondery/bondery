import { IconCheck } from "@tabler/icons-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { normalizeHex } from "./colorUtils";
import { COLOR_PICKER_LAYOUT, GROUP_COLOR_SWATCH_ROWS } from "./constants";

interface ColorSwatchGridProps {
  onSelect: (hex: string) => void;
  value: string;
}

export function ColorSwatchGrid({ value, onSelect }: ColorSwatchGridProps) {
  const selectedHex = normalizeHex(value);

  return (
    <View style={styles.grid}>
      {GROUP_COLOR_SWATCH_ROWS.map((row) => (
        <View key={row[0]} style={styles.row}>
          {row.map((hex) => {
            const normalized = normalizeHex(hex);
            const isSelected = selectedHex === normalized;

            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                key={hex}
                onPress={() => onSelect(normalized)}
                style={[
                  styles.swatch,
                  { backgroundColor: hex },
                  isSelected && styles.swatchSelected,
                ]}
              >
                {isSelected ? <IconCheck color="#ffffff" size={12} strokeWidth={2.5} /> : null}
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
    alignItems: "center",
    gap: COLOR_PICKER_LAYOUT.swatchGap,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    gap: COLOR_PICKER_LAYOUT.swatchGap,
    justifyContent: "center",
  },
  swatch: {
    alignItems: "center",
    borderRadius: COLOR_PICKER_LAYOUT.swatchSize / 2,
    height: COLOR_PICKER_LAYOUT.swatchSize,
    justifyContent: "center",
    width: COLOR_PICKER_LAYOUT.swatchSize,
  },
  swatchSelected: {
    borderColor: "rgba(255,255,255,0.85)",
    borderWidth: 2,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
});
