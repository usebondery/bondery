import { useCallback, useMemo, useState } from "react";
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface AlphabetScrollerProps {
  letters: string[];
  onLetterChange: (letter: string) => void;
}

export function AlphabetScroller({ letters, onLetterChange }: AlphabetScrollerProps) {
  const colors = useMobileThemeColors();
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const maxIndex = Math.max(letters.length - 1, 0);

  const updateLetterByPosition = useCallback(
    (locationY: number) => {
      if (!containerHeight || letters.length === 0) {
        return;
      }

      const rowHeight = containerHeight / letters.length;
      const rawIndex = Math.floor(locationY / rowHeight);
      const boundedIndex = Math.min(Math.max(rawIndex, 0), maxIndex);
      const selectedLetter = letters[boundedIndex];

      setActiveLetter((currentLetter) => {
        if (currentLetter === selectedLetter) {
          return currentLetter;
        }

        onLetterChange(selectedLetter);
        return selectedLetter;
      });
    },
    [containerHeight, letters, maxIndex, onLetterChange],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event: GestureResponderEvent) =>
          updateLetterByPosition(event.nativeEvent.locationY),
        onPanResponderMove: (event: GestureResponderEvent) =>
          updateLetterByPosition(event.nativeEvent.locationY),
        onPanResponderRelease: () => setActiveLetter(null),
        onPanResponderTerminate: () => setActiveLetter(null),
        onStartShouldSetPanResponder: () => true,
      }),
    [updateLetterByPosition],
  );

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    setContainerHeight(event.nativeEvent.layout.height);
  };

  if (letters.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      {activeLetter ? (
        <View style={[styles.bubble, { backgroundColor: colors.textPrimary }]}>
          <Text style={[styles.bubbleText, { color: colors.textOnPrimary }]}>{activeLetter}</Text>
        </View>
      ) : null}
      <View
        onLayout={handleContainerLayout}
        style={[styles.lettersContainer, { backgroundColor: colors.overlay }]}
        {...panResponder.panHandlers}
      >
        {letters.map((letter) => (
          <Text
            key={letter}
            style={[
              styles.letter,
              { color: colors.textMuted },
              activeLetter === letter && [styles.letterActive, { color: colors.textPrimary }],
            ]}
          >
            {letter}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.alphabetScroller.bubble / 2,
    height: MOBILE_LAYOUT.alphabetScroller.bubble,
    justifyContent: "center",
    position: "absolute",
    right: 34,
    width: MOBILE_LAYOUT.alphabetScroller.bubble,
  },
  bubbleText: {
    fontSize: 20,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  letter: {
    fontSize: 10,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
    textAlign: "center",
    width: 14,
  },
  letterActive: {},
  lettersContainer: {
    borderRadius: 12,
    gap: 1,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  wrapper: {
    alignItems: "center",
    bottom: 32,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 110,
    zIndex: 20,
  },
});
