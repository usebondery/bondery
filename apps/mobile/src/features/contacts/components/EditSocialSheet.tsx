import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type TextInput } from "react-native";
import { IconCheck, IconTrash } from "@tabler/icons-react-native";
import {
  extractUsername,
  type ContactSocialFieldKey,
} from "@bondery/helpers";
import { socialHandleInputSchema, socialHandleSchema } from "@bondery/schemas";
import { ActionSheetPopup, type ActionSheetPopupAction } from "../../../components/ActionSheetPopup";
import { SheetTextField } from "../../../components/form";
import { UI_TIMING_MS } from "../../../lib/config";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import {
  CONTACT_SOCIAL_PLATFORMS,
  getContactSocialPlatform,
  type ContactSocialPlatformConfig,
} from "./contactSocialConfig";

type SheetMode = "add" | "edit";

interface EditSocialSheetProps {
  open: boolean;
  mode: SheetMode;
  platform: ContactSocialFieldKey | null;
  initialValue: string;
  availablePlatforms: ContactSocialFieldKey[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onSave: (platform: ContactSocialFieldKey, value: string) => void;
}

function getDisplayValue(platform: ContactSocialFieldKey, value: string): string {
  if (!value) return "";

  if (platform === "linkedin" || platform === "instagram" || platform === "facebook" || platform === "whatsapp") {
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
  const t = useMobileTranslations();
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
    open,
    schema: socialHandleInputSchema.pick({ value: true }),
    getDefaultValues: () => ({
      value: platform ? getDisplayValue(platform, initialValue) : "",
    }),
    mode: "onChange",
  });

  const activePlatform = selectedPlatform ?? platform;
  const platformConfig = activePlatform ? getContactSocialPlatform(activePlatform) : null;

  useEffect(() => {
    if (!open) return;

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
    if (!open || !activePlatform) return;

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

  const canSubmit =
    Boolean(activePlatform) && isValid && (mode === "edit" ? isDirty : true);

  const editTitle = activePlatform
    ? `Edit ${activePlatform.charAt(0).toUpperCase()}${activePlatform.slice(1)}`
    : "Edit social link";

  const sheetTitle = mode === "add" ? "Add social link" : editTitle;

  const handleBlur = (currentValue: string) => {
    if (!activePlatform) return;

    if (activePlatform === "linkedin" || activePlatform === "instagram" || activePlatform === "facebook") {
      reset({ value: extractUsername(activePlatform, currentValue) }, { keepDirty: true });
    } else if (activePlatform === "whatsapp") {
      reset({ value: extractUsername("whatsapp", currentValue) || currentValue }, { keepDirty: true });
    }
  };

  const onSubmit = handleSubmit(({ value: submittedValue }) => {
    if (!activePlatform || !canSubmit) return;

    const parsed = socialHandleSchema.safeParse({
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
    if (!activePlatform || isSubmitting) return;
    onSave(activePlatform, "");
  };

  const primaryAction = {
    label: mode === "add" ? "Add social" : "Save changes",
    icon: <IconCheck size={16} color={colors.textOnPrimary} />,
    onPress: () => void onSubmit(),
    disabled: !canSubmit,
    loading: isSubmitting,
    tone: "primary" as const,
    variant: "filled" as const,
  };

  const actions: [ActionSheetPopupAction] | [ActionSheetPopupAction, ActionSheetPopupAction] =
    mode === "edit"
      ? [
          {
            label: "Delete social",
            icon: <IconTrash size={16} color={colors.dangerAccent} />,
            onPress: handleDelete,
            disabled: isSubmitting,
            tone: "danger",
            variant: "outline",
          },
          primaryAction,
        ]
      : [primaryAction];

  return (
    <ActionSheetPopup
      open={open}
      title={sheetTitle}
      actions={actions}
      onOpenChange={onOpenChange}
      onClose={onCancel}
      isBusy={isSubmitting}
    >
      {mode === "add" && pickerPlatforms.length > 0 ? (
        <View style={styles.platformRow}>
          {pickerPlatforms.map((item) => (
            <PlatformChip
              key={item.key}
              config={item}
              selected={activePlatform === item.key}
              onPress={() => {
                setSelectedPlatform(item.key);
                reset({ value: "" });
                setError(null);
              }}
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
            control={control}
            name="value"
            inputRef={inputRef}
            containerStyle={styles.inputField}
            onFieldChange={() => {
              if (error) setError(null);
            }}
            onFieldBlur={handleBlur}
            placeholder={t(platformConfig.placeholderKey)}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={
              activePlatform === "whatsapp" || activePlatform === "signal"
                ? "phone-pad"
                : "default"
            }
            editable={!isSubmitting}
            externalErrorMessage={error ?? undefined}
            returnKeyType="done"
            enterKeyHint="done"
            onSubmitEditing={() => void onSubmit()}
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
          borderColor: selected ? config.color : colors.border,
          backgroundColor: selected ? colors.selectionBackground : colors.surface,
        },
      ]}
    >
      {config.renderIcon(config.color)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  platformRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    width: MOBILE_LAYOUT.touchTarget,
    height: MOBILE_LAYOUT.touchTarget,
    borderRadius: MOBILE_LAYOUT.borderRadius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputIcon: {
    width: MOBILE_LAYOUT.touchTarget,
    height: MOBILE_LAYOUT.touchTarget,
    borderRadius: MOBILE_LAYOUT.borderRadius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inputField: {
    flex: 1,
  },
});
