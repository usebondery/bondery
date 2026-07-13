import { type ContactSocialFieldKey, extractUsername } from "@bondery/helpers";
import { normalizedSocialHandleSchema } from "@bondery/helpers/forms";
import { socialHandleInputSchema } from "@bondery/schemas";
import { IconCheck, IconTrash } from "@tabler/icons-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, type TextInput, View } from "react-native";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";
import {
  ActionSheetPopup,
  type ActionSheetPopupAction,
} from "../../../components/ActionSheetPopup";
import { SheetTextField } from "../../../components/form";
import { UI_TIMING_MS } from "../../../lib/config";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import {
  CONTACT_SOCIAL_PLATFORMS,
  type ContactSocialPlatformConfig,
  getContactSocialPlatform,
} from "./contactSocialConfig";

type SheetMode = "add" | "edit";

interface EditSocialSheetProps {
  availablePlatforms: ContactSocialFieldKey[];
  initialValue: string;
  isSubmitting: boolean;
  mode: SheetMode;
  onCancel: () => void;
  onOpenChange: (open: boolean) => void;
  onSave: (platform: ContactSocialFieldKey, value: string) => void;
  open: boolean;
  platform: ContactSocialFieldKey | null;
}

function getDisplayValue(platform: ContactSocialFieldKey, value: string): string {
  if (!value) {
    return "";
  }

  if (
    platform === "linkedin" ||
    platform === "instagram" ||
    platform === "facebook" ||
    platform === "whatsapp"
  ) {
    return extractUsername(platform, value);
  }

  return value;
}

/**
 * Bottom sheet for adding or editing a contact social handle.
 */
export function EditSocialSheet({
  open,
  mode,
  platform,
  initialValue,
  availablePlatforms,
  isSubmitting,
  onOpenChange,
  onCancel,
  onSave,
}: EditSocialSheetProps) {
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const inputRef = useRef<TextInput>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<ContactSocialFieldKey | null>(platform);
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid },
  } = useSheetForm({
    getDefaultValues: () => ({
      value: platform ? getDisplayValue(platform, initialValue) : "",
    }),
    mode: "onChange",
    open,
    schema: socialHandleInputSchema.pick({ value: true }),
  });

  const activePlatform = selectedPlatform ?? platform;
  const platformConfig = activePlatform ? getContactSocialPlatform(activePlatform) : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "add") {
      const nextPlatform = platform ?? availablePlatforms[0] ?? null;
      setSelectedPlatform(nextPlatform);
      reset({ value: "" });
    } else {
      setSelectedPlatform(platform);
      reset({ value: platform ? getDisplayValue(platform, initialValue) : "" });
    }

    setError(null);
  }, [open, platform, initialValue, mode, availablePlatforms, reset]);

  useEffect(() => {
    if (!open || !activePlatform) {
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);

    return () => clearTimeout(timer);
  }, [open, activePlatform]);

  const pickerPlatforms = useMemo(() => {
    if (mode === "edit" && platform) {
      return [getContactSocialPlatform(platform)];
    }

    return CONTACT_SOCIAL_PLATFORMS.filter((item) => availablePlatforms.includes(item.key));
  }, [availablePlatforms, mode, platform]);

  const canSubmit = Boolean(activePlatform) && isValid && (mode === "edit" ? isDirty : true);

  const editTitle = activePlatform
    ? `Edit ${activePlatform.charAt(0).toUpperCase()}${activePlatform.slice(1)}`
    : "Edit social link";

  const sheetTitle = mode === "add" ? "Add social link" : editTitle;

  const handleBlur = (currentValue: string) => {
    if (!activePlatform) {
      return;
    }

    if (
      activePlatform === "linkedin" ||
      activePlatform === "instagram" ||
      activePlatform === "facebook"
    ) {
      reset({ value: extractUsername(activePlatform, currentValue) }, { keepDirty: true });
    } else if (activePlatform === "whatsapp") {
      reset(
        { value: extractUsername("whatsapp", currentValue) || currentValue },
        { keepDirty: true },
      );
    }
  };

  const onSubmit = handleSubmit(({ value: submittedValue }) => {
    if (!activePlatform || !canSubmit) {
      return;
    }

    const parsed = normalizedSocialHandleSchema.safeParse({
      platform: activePlatform,
      value: submittedValue,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please enter a valid value");
      return;
    }

    setError(null);
    onSave(parsed.data.platform, parsed.data.value);
  });

  const handleDelete = () => {
    if (!activePlatform || isSubmitting) {
      return;
    }
    onSave(activePlatform, "");
  };

  const primaryAction = {
    disabled: !canSubmit,
    icon: <IconCheck color={colors.textOnPrimary} size={16} />,
    label: mode === "add" ? "Add social" : "Save changes",
    loading: isSubmitting,
    onPress: () => void onSubmit(),
    tone: "primary" as const,
    variant: "filled" as const,
  };

  const actions: [ActionSheetPopupAction] | [ActionSheetPopupAction, ActionSheetPopupAction] =
    mode === "edit"
      ? [
          {
            disabled: isSubmitting,
            icon: <IconTrash color={colors.dangerAccent} size={16} />,
            label: "Delete social",
            onPress: handleDelete,
            tone: "danger",
            variant: "outline",
          },
          primaryAction,
        ]
      : [primaryAction];

  return (
    <ActionSheetPopup
      actions={actions}
      isBusy={isSubmitting}
      onClose={onCancel}
      onOpenChange={onOpenChange}
      open={open}
      title={sheetTitle}
    >
      {mode === "add" && pickerPlatforms.length > 0 ? (
        <View style={styles.platformRow}>
          {pickerPlatforms.map((item) => (
            <PlatformChip
              config={item}
              key={item.key}
              onPress={() => {
                setSelectedPlatform(item.key);
                reset({ value: "" });
                setError(null);
              }}
              selected={activePlatform === item.key}
            />
          ))}
        </View>
      ) : null}

      {platformConfig ? (
        <View style={styles.inputWrap}>
          <View style={[styles.inputIcon, { borderColor: platformConfig.color }]}>
            {platformConfig.renderIcon(platformConfig.color)}
          </View>
          <SheetTextField
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            containerStyle={styles.inputField}
            control={control}
            editable={!isSubmitting}
            enterKeyHint="done"
            externalErrorMessage={error ?? undefined}
            inputRef={inputRef}
            keyboardType={
              activePlatform === "whatsapp" || activePlatform === "signal" ? "phone-pad" : "default"
            }
            name="value"
            onFieldBlur={handleBlur}
            onFieldChange={() => {
              if (error) {
                setError(null);
              }
            }}
            onSubmitEditing={() => void onSubmit()}
            placeholder={t(platformConfig.placeholderKey)}
            returnKeyType="done"
          />
        </View>
      ) : null}
    </ActionSheetPopup>
  );
}

function PlatformChip({
  config,
  selected,
  onPress,
}: {
  config: ContactSocialPlatformConfig;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useMobileThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.selectionBackground : colors.surface,
          borderColor: selected ? config.color : colors.border,
        },
      ]}
    >
      {config.renderIcon(config.color)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.pill,
    borderWidth: 1,
    height: MOBILE_LAYOUT.touchTarget,
    justifyContent: "center",
    width: MOBILE_LAYOUT.touchTarget,
  },
  inputField: {
    flex: 1,
  },
  inputIcon: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.pill,
    borderWidth: 1,
    height: MOBILE_LAYOUT.touchTarget,
    justifyContent: "center",
    width: MOBILE_LAYOUT.touchTarget,
  },
  inputWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  platformRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});
