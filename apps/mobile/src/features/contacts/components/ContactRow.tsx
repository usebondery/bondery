import { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { IconCheck, IconDotsVertical } from "@tabler/icons-react-native";
import type { Contact } from "@bondery/types";
import type { SwipeAction } from "../../../lib/preferences/useMobilePreferences";
import { formatContactName, getContactInitial } from "../contactUtils";

interface ContactRowProps {
  contact: Contact;
  selected: boolean;
  selectionMode: boolean;
  leftSwipeAction: SwipeAction;
  rightSwipeAction: SwipeAction;
  texts: {
    call: string;
    message: string;
    quickActionsTitle: string;
    select: string;
    deselect: string;
    cancel: string;
  };
  onToggleSelect: (contactId: string) => void;
  onExecuteAction: (contact: Contact, action: SwipeAction) => void;
}

export function ContactRow({
  contact,
  selected,
  selectionMode,
  leftSwipeAction,
  rightSwipeAction,
  texts,
  onToggleSelect,
  onExecuteAction,
}: ContactRowProps) {
  const name = useMemo(() => formatContactName(contact), [contact]);

  const openOptions = () => {
    Alert.alert(name, texts.quickActionsTitle, [
      {
        text: texts.call,
        onPress: () => onExecuteAction(contact, "call"),
      },
      {
        text: texts.message,
        onPress: () => onExecuteAction(contact, "message"),
      },
      {
        text: selected ? texts.deselect : texts.select,
        onPress: () => onToggleSelect(contact.id),
      },
      { text: texts.cancel, style: "cancel" },
    ]);
  };

  return (
    <Swipeable
      friction={2}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableOpen={(direction: "left" | "right") => {
        if (direction === "left") {
          onExecuteAction(contact, leftSwipeAction);
        } else {
          onExecuteAction(contact, rightSwipeAction);
        }
      }}
      renderLeftActions={() => (
        <View style={[styles.action, styles.leftAction]}>
          <Text style={styles.actionText}>
            {rightSwipeAction === "call" ? texts.call : texts.message}
          </Text>
        </View>
      )}
      renderRightActions={() => (
        <View style={[styles.action, styles.rightAction]}>
          <Text style={styles.actionText}>
            {leftSwipeAction === "call" ? texts.call : texts.message}
          </Text>
        </View>
      )}
    >
      <Pressable
        onLongPress={() => onToggleSelect(contact.id)}
        onPress={() => {
          if (selectionMode) {
            onToggleSelect(contact.id);
          }
        }}
        style={[styles.container, selected && styles.containerSelected]}
      >
        <View style={styles.leftSide}>
          <View style={[styles.avatar, selected && styles.avatarSelected]}>
            {selected ? (
              <IconCheck size={16} stroke="#111827" />
            ) : (
              <Text style={styles.avatarText}>{getContactInitial(contact)}</Text>
            )}
          </View>
          <Text numberOfLines={1} style={styles.nameText}>
            {name}
          </Text>
        </View>

        <Pressable hitSlop={10} onPress={openOptions} style={styles.optionsButton}>
          <IconDotsVertical size={18} stroke="#6b7280" />
        </Pressable>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
  },
  containerSelected: {
    backgroundColor: "#eef2ff",
  },
  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  avatarSelected: {
    backgroundColor: "#c7d2fe",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  nameText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
    flexShrink: 1,
  },
  optionsButton: {
    padding: 4,
  },
  action: {
    justifyContent: "center",
    width: 100,
    alignItems: "center",
  },
  leftAction: {
    backgroundColor: "#dcfce7",
  },
  rightAction: {
    backgroundColor: "#fef3c7",
  },
  actionText: {
    fontWeight: "700",
    color: "#1f2937",
  },
});
