import {
  IconAlertCircle,
  IconCircleCheck,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react-native";
import { ActivityIndicator, View } from "react-native";
import { Pressable } from "@/components/ui/Pressable";
import { Text } from "../../components/ui/Text";
import type { MobileThemeColors } from "../../theme/colors";
import { MOBILE_HIT_SLOP } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { useCommonTranslations } from "../i18n/generated/hooks";
import type { NotificationType } from "./notifications";

interface ToastThemeConfig {
  borderColor: string;
  iconColor: string;
}

function getToastTheme(type: NotificationType, colors: MobileThemeColors): ToastThemeConfig {
  if (type === "success") {
    return {
      borderColor: colors.successSurface,
      iconColor: colors.successAccent,
    };
  }

  if (type === "error") {
    return {
      borderColor: colors.dangerSurface,
      iconColor: colors.dangerAccent,
    };
  }

  return {
    borderColor: colors.border,
    iconColor: colors.textMuted,
  };
}

function ToastTypeIcon({ type, iconColor }: { type: NotificationType; iconColor: string }) {
  if (type === "loading") {
    return <ActivityIndicator color={iconColor} size={24} />;
  }

  if (type === "success") {
    return <IconCircleCheck color={iconColor} size={24} />;
  }

  if (type === "error") {
    return <IconAlertCircle color={iconColor} size={24} />;
  }

  return <IconInfoCircle color={iconColor} size={24} />;
}

export function AppToastBanner({
  type,
  title,
  message,
  onDismiss,
}: {
  message?: string;
  onDismiss: () => void;
  title: string;
  type: NotificationType;
}) {
  const colors = useMobileThemeColors();
  const t = useCommonTranslations();
  const toastTheme = getToastTheme(type, colors);
  const isLoading = type === "loading";

  return (
    <View
      accessibilityLiveRegion="polite"
      className="mx-4 flex-row items-center gap-2.5 rounded-[14px] border px-3.5 py-3"
      style={{
        backgroundColor: colors.surface,
        borderColor: toastTheme.borderColor,
        elevation: 4,
        shadowColor: colors.shadow,
        shadowOffset: { height: 4, width: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      }}
    >
      <View className="h-[30px] w-[30px] items-center justify-center">
        <ToastTypeIcon iconColor={toastTheme.iconColor} type={type} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text fw={700} size="md">
          {title}
        </Text>
        {message ? (
          <Text c="secondary" className="leading-[18px]" size="sm">
            {message}
          </Text>
        ) : null}
      </View>
      {isLoading ? null : (
        <Pressable
          accessibilityLabel={t("feedback.closeToast")}
          accessibilityRole="button"
          className="rounded-full p-1"
          hitSlop={MOBILE_HIT_SLOP.compact}
          onPress={onDismiss}
        >
          <IconX color={colors.iconSecondary} size={16} />
        </Pressable>
      )}
    </View>
  );
}
