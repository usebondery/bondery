import { StyleSheet, View } from "react-native";
import { IconCamera, IconTrash } from "@tabler/icons-react-native";
import { MobileIconButton } from "../../../components/MobileIconButton";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface AvatarPhotoOverlayControlsProps {
  showRemove: boolean;
  disabled?: boolean;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
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
          icon={<IconCamera size={16} stroke={colors.iconPrimary} />}
          accessibilityLabel={t("MobileApp.ContactIdentity.ChangePhoto")}
          onPress={onChangePhoto}
          disabled={disabled}
        />
      </View>

      {showRemove ? (
        <View style={avatarPhotoOverlayStyles.topRight}>
          <MobileIconButton
            icon={<IconTrash size={16} stroke={colors.dangerAccent} />}
            accessibilityLabel={t("MobileApp.ContactIdentity.RemovePhoto")}
            onPress={onRemovePhoto}
            disabled={disabled}
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
    position: "relative",
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  topLeft: {
    position: "absolute",
    top: OVERLAY_OFFSET,
    left: OVERLAY_OFFSET,
    zIndex: 2,
  },
  topRight: {
    position: "absolute",
    top: OVERLAY_OFFSET,
    right: OVERLAY_OFFSET,
    zIndex: 2,
  },
});
