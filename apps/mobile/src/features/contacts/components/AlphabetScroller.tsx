import { useMemo, useState } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface AlphabetScrollerProps {
  letters: string[];
  onLetterChange: (letter: string) => void;
}

export function AlphabetScroller({ letters, onLetterChange }: AlphabetScrollerProps) {
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const maxIndex = Math.max(letters.length - 1, 0);

  const updateLetterByPosition = (gestureState: PanResponderGestureState) => {
    if (!containerHeight || letters.length === 0) {
      return;
    }

    const rowHeight = containerHeight / letters.length;
    const rawIndex = Math.floor(gestureState.y0 / rowHeight + gestureState.dy / rowHeight);
    const boundedIndex = Math.min(Math.max(rawIndex, 0), maxIndex);
    const selectedLetter = letters[boundedIndex];

    setActiveLetter(selectedLetter);
    onLetterChange(selectedLetter);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (
          _event: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => updateLetterByPosition(gestureState),
        onPanResponderMove: (
          _event: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => updateLetterByPosition(gestureState),
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
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{activeLetter}</Text>
        </View>
      ) : null}
      <View
        onLayout={handleContainerLayout}
        style={styles.lettersContainer}
        {...panResponder.panHandlers}
      >
        {letters.map((letter) => (
          <Text
            key={letter}
            style={[styles.letter, activeLetter === letter && styles.letterActive]}
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
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 1,
  },
  letter: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
    width: 14,
  },
  letterActive: {
    color: "#111827",
  },
  bubble: {
    position: "absolute",
    right: 34,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  bubbleText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
});
