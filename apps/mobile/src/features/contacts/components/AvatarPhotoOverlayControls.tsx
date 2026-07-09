import { IconCamera, IconTrash } from "@tabler/icons-react-native";
import { StyleSheet, View } from "react-native";
import { MobileIconButton } from "../../../components/MobileIconButton";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface AvatarPhotoOverlayControlsProps {
  disabled?: boolean;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
  showRemove: boolean;
}

export function AvatarPhotoOverlayControls({
  showRemove,
  disabled = false,
  onChangePhoto,
  onRemovePhoto,
}: AvatarPhotoOverlayControlsProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();

  return (
    <>
      <View style={avatarPhotoOverlayStyles.topLeft}>
        <MobileIconButton
          accessibilityLabel={t("ChangePhoto", { ns: "MobileContactIdentity" })}
          disabled={disabled}
          icon={<IconCamera size={16} stroke={colors.iconPrimary} />}
          onPress={onChangePhoto}
        />
      </View>

      {showRemove ? (
        <View style={avatarPhotoOverlayStyles.topRight}>
          <MobileIconButton
            accessibilityLabel={t("RemovePhoto", { ns: "MobileContactIdentity" })}
            disabled={disabled}
            icon={<IconTrash size={16} stroke={colors.dangerAccent} />}
            onPress={onRemovePhoto}
            tone="danger"
          />
        </View>
      ) : null}
    </>
  );
}

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
