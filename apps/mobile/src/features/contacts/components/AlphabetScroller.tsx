import { useMemo, useState } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
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

  const updateLetterByPosition = (locationY: number) => {
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
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event: GestureResponderEvent) =>
          updateLetterByPosition(event.nativeEvent.locationY),
        onPanResponderMove: (event: GestureResponderEvent) =>
          updateLetterByPosition(event.nativeEvent.locationY),
        onPanResponderRelease: () => setActiveLetter(null),
        onPanResponderTerminate: () => setActiveLetter(null),
      }),
    [containerHeight, letters],
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
  wrapper: {
    position: "absolute",
    right: 4,
    top: 110,
    bottom: 32,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  lettersContainer: {
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 1,
  },
  letter: {
    fontSize: 10,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
    textAlign: "center",
    width: 14,
  },
  letterActive: {},
  bubble: {
    position: "absolute",
    right: 34,
    width: MOBILE_LAYOUT.alphabetScroller.bubble,
    height: MOBILE_LAYOUT.alphabetScroller.bubble,
    borderRadius: MOBILE_LAYOUT.alphabetScroller.bubble / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  bubbleText: {
    fontSize: 20,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
});
