import { IconCamera, IconTrash } from "@tabler/icons-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { useMobileContactIdentityTranslations } from "@/lib/i18n/generated/hooks";
import { usePressSqueeze } from "../../../components/ui/usePressSqueeze";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface AvatarPhotoOverlayControlsProps {
  disabled?: boolean;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
  showRemove: boolean;
}

function OverlayIconButton({
  accessibilityLabel,
  backgroundColor,
  borderColor,
  disabled,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  backgroundColor: string;
  borderColor: string;
  disabled?: boolean;
  icon: ReactNode;
  onPress: () => void;
}) {
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");

  return (
    <Animated.View style={squeezeStyle}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={MOBILE_HIT_SLOP.compact}
        onPress={onPress}
        onPressIn={() => {
          if (disabled) {
            return;
          }
          pressIn();
        }}
        onPressOut={pressOut}
        style={[
          overlayButtonStyles.button,
          {
            backgroundColor,
            borderColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {icon}
      </Pressable>
    </Animated.View>
  );
}

export function AvatarPhotoOverlayControls({
  showRemove,
  disabled = false,
  onChangePhoto,
  onRemovePhoto,
}: AvatarPhotoOverlayControlsProps) {
  const tMobileContactIdentity = useMobileContactIdentityTranslations();
  const colors = useMobileThemeColors();

  return (
    <>
      <View style={avatarPhotoOverlayStyles.topLeft}>
        <OverlayIconButton
          accessibilityLabel={tMobileContactIdentity("ChangePhoto")}
          backgroundColor={colors.surfaceElevated}
          borderColor={colors.borderStrong}
          disabled={disabled}
          icon={<IconCamera size={16} stroke={colors.iconPrimary} />}
          onPress={onChangePhoto}
        />
      </View>

      {showRemove ? (
        <View style={avatarPhotoOverlayStyles.topRight}>
          <OverlayIconButton
            accessibilityLabel={tMobileContactIdentity("RemovePhoto")}
            backgroundColor={colors.dangerSurface}
            borderColor={colors.dangerAccent}
            disabled={disabled}
            icon={<IconTrash size={16} stroke={colors.dangerAccent} />}
            onPress={onRemovePhoto}
          />
        </View>
      ) : null}
    </>
  );
}

const overlayButtonStyles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.pill,
    borderWidth: 1,
    height: MOBILE_LAYOUT.iconButton,
    justifyContent: "center",
    width: MOBILE_LAYOUT.iconButton,
  },
});

const OVERLAY_OFFSET = -4;

export const avatarPhotoOverlayStyles = StyleSheet.create({
  avatarFrame: {
    alignItems: "center",
    height: 96,
    justifyContent: "center",
    position: "relative",
    width: 96,
  },
  topLeft: {
    left: OVERLAY_OFFSET,
    position: "absolute",
    top: OVERLAY_OFFSET,
    zIndex: 2,
  },
  topRight: {
    position: "absolute",
    right: OVERLAY_OFFSET,
    top: OVERLAY_OFFSET,
    zIndex: 2,
  },
});
