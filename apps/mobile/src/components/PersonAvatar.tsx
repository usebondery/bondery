import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { withUniwind } from "uniwind";
import { Pressable } from "@/components/ui/Pressable";
import { getAvatarColorHex, getContactInitials } from "../features/contacts/contactUtils";
import { getLocalAvatarFileUri } from "../lib/sync/avatar-files";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";
import { buildPersonAvatarSources } from "./personAvatarSources";
import { usePressSqueeze } from "./ui/usePressSqueeze";

const UniwindImage = withUniwind(Image);

function readLocalAvatarUri(personId: string): string | null {
  try {
    return getLocalAvatarFileUri(personId);
  } catch {
    return null;
  }
}

function PersonAvatarImage({ personId, sources }: { personId: string; sources: string[] }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const activeUri = sourceIndex < sources.length ? sources[sourceIndex] : null;
  if (!activeUri) {
    return null;
  }

  return (
    <UniwindImage
      cachePolicy="memory-disk"
      className="absolute inset-0"
      contentFit="cover"
      onError={() => {
        setSourceIndex((current) => current + 1);
      }}
      pointerEvents="none"
      recyclingKey={personId}
      source={{ uri: activeUri }}
      transition={0}
    />
  );
}

interface PersonAvatarProps {
  accessibilityLabel?: string;
  disabled?: boolean;
  initials?: string;
  onPress?: () => void;
  person: {
    firstName?: string | null;
    id: string;
    lastName?: string | null;
  };
  size: number;
  skipLocalFile?: boolean;
  uri?: string | null;
}

/**
 * Always paints hashed initials. expo-image has no React-node fallback, so a
 * photo overlays them and unmounts after every source in the chain fails.
 */
export function PersonAvatar({
  accessibilityLabel,
  disabled = false,
  initials: initialsOverride,
  onPress,
  person,
  size,
  skipLocalFile = false,
  uri,
}: PersonAvatarProps) {
  const colors = useMobileThemeColors();
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("default");
  const localFileUri = skipLocalFile ? null : readLocalAvatarUri(person.id);
  const sources = buildPersonAvatarSources({
    localFileUri,
    skipLocalFile,
    uri,
  });
  const chainKey = `${person.id}:${sources.join("\0")}`;
  const initials = initialsOverride ?? getContactInitials(person);
  const backgroundColor = getAvatarColorHex(person);
  const isPressable = onPress != null;

  const avatar = (
    <View
      accessibilityLabel={isPressable ? undefined : accessibilityLabel}
      accessibilityRole={isPressable ? undefined : "image"}
      accessible={!isPressable && Boolean(accessibilityLabel)}
      className="items-center justify-center overflow-hidden rounded-full"
      style={{
        backgroundColor,
        height: size,
        width: size,
      }}
    >
      <Text
        className="font-semibold"
        style={{
          color: colors.textOnPrimary,
          fontSize: Math.round(size * 0.36),
        }}
      >
        {initials}
      </Text>
      {sources.length > 0 ? (
        <PersonAvatarImage key={chainKey} personId={person.id} sources={sources} />
      ) : null}
    </View>
  );

  if (!isPressable) {
    return avatar;
  }

  return (
    <Animated.View style={[squeezeStyle, disabled ? { opacity: 0.6 } : undefined]}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (disabled) {
            return;
          }
          pressIn();
        }}
        onPressOut={pressOut}
      >
        {avatar}
      </Pressable>
    </Animated.View>
  );
}
