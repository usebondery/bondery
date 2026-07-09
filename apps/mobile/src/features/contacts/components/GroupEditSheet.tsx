import { getRandomEmoji } from "@bondery/helpers/emoji";
import type { Group } from "@bondery/schemas";
import { createGroupSchema, GROUP_LABEL_MAX_LENGTH } from "@bondery/schemas";
import { IconCheck, IconTrash } from "@tabler/icons-react-native";
import { type RefObject, useEffect, useRef, useState } from "react";
import { type Control, type UseFormSetValue, useWatch } from "react-hook-form";
import { StyleSheet, type TextInput, View } from "react-native";
import {
  ActionSheetPopup,
  type ActionSheetPopupAction,
} from "../../../components/ActionSheetPopup";
import {
  ColorPickerInput,
  DEFAULT_GROUP_COLOR,
  getRandomGroupColor,
} from "../../../components/color-picker";
import { EmojiPickerInput } from "../../../components/emoji-picker";
import { SheetTextField } from "../../../components/form";
import { UI_TIMING_MS } from "../../../lib/config";
import { createGroup, updateGroup } from "../../../lib/domains/groups";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { GroupDeleteDialog } from "./GroupDeleteDialog";

type GroupEditSheetProps =
  | {
      mode: "create";
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onCreated: (group: Group) => void;
    }
  | {
      mode: "edit";
      open: boolean;
      groupId: string;
      initialLabel: string;
      initialEmoji: string;
      initialColor: string;
      onOpenChange: (open: boolean) => void;
      onSaved: (group: Group) => void;
      onDeleted: () => void;
    };

export function GroupEditSheet(props: GroupEditSheetProps) {
  const { mode, open, onOpenChange } = props;
  const editInitialLabel = mode === "edit" ? props.initialLabel : "";
  const editInitialEmoji = mode === "edit" ? props.initialEmoji : "";
  const editInitialColor =
    mode === "edit" ? props.initialColor || DEFAULT_GROUP_COLOR : DEFAULT_GROUP_COLOR;

  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const labelRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isDirty, isValid, isSubmitting },
  } = useSheetForm({
    getDefaultValues: () =>
      mode === "create"
        ? {
            color: getRandomGroupColor(),
            emoji: getRandomEmoji(),
            label: "",
          }
        : {
            color: editInitialColor,
            emoji: editInitialEmoji,
            label: editInitialLabel,
          },
    mode: "onChange",
    open,
    schema: createGroupSchema,
  });
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      labelRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);

    return () => clearTimeout(timer);
  }, [open]);

  const canSave =
    mode === "create" ? isValid && !isSubmitting : isDirty && isValid && !isSubmitting;

  const onSubmit = handleSubmit(async (values) => {
    if (!canSave) {
      return;
    }
    try {
      if (mode === "create") {
        const group = createGroup({
          color: values.color,
          emoji: values.emoji,
          label: values.label,
        });
        onOpenChange(false);
        props.onCreated(group);
        return;
      }

      const group = updateGroup(props.groupId, {
        color: values.color,
        emoji: values.emoji,
        label: values.label,
      });

      onOpenChange(false);
      props.onSaved(group);
    } catch {
      showToast({
        description:
          mode === "create"
            ? t("CreateFailed", { ns: "MobileGroups" })
            : t("EditFailed", { ns: "MobileGroups" }),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
      });
    }
  });

  const sheetTitle =
    mode === "create"
      ? t("CreateSheetTitle", { ns: "MobileGroups" })
      : t("EditSheetTitle", { ns: "MobileGroups" });
  const saveLabel =
    mode === "create"
      ? t("CreateSave", { ns: "MobileGroups" })
      : t("EditSave", { ns: "MobileGroups" });

  const primaryAction: ActionSheetPopupAction = {
    disabled: !canSave,
    icon: <IconCheck size={16} stroke={colors.textOnPrimary} />,
    label: saveLabel,
    loading: isSubmitting,
    onPress: () => void onSubmit(),
    tone: "primary",
    variant: "filled",
  };

  const actions: [ActionSheetPopupAction] | [ActionSheetPopupAction, ActionSheetPopupAction] =
    mode === "edit"
      ? [
          {
            disabled: isSubmitting,
            icon: <IconTrash size={16} stroke={colors.dangerAccent} />,
            label: t("DeleteGroup", { ns: "MobileGroups" }),
            onPress: () => setDeleteDialogOpen(true),
            tone: "danger",
            variant: "outline",
          },
          primaryAction,
        ]
      : [primaryAction];

  const deleteDialogTitle =
    mode === "edit" && editInitialEmoji
      ? `${editInitialEmoji} ${editInitialLabel}`
      : editInitialLabel;

  return (
    <>
      <ActionSheetPopup
        actions={actions}
        isBusy={isSubmitting}
        onClose={() => onOpenChange(false)}
        onOpenChange={onOpenChange}
        open={open}
        title={sheetTitle}
      >
        <GroupEditFields
          control={control}
          isSubmitting={isSubmitting}
          labelRef={labelRef}
          onSubmit={() => void onSubmit()}
          setValue={setValue}
          showToast={showToast}
          t={t}
        />
      </ActionSheetPopup>

      {mode === "edit" ? (
        <GroupDeleteDialog
          groupId={props.groupId}
          groupTitle={deleteDialogTitle}
          onDeleted={() => {
            onOpenChange(false);
            props.onDeleted();
          }}
          onOpenChange={setDeleteDialogOpen}
          open={isDeleteDialogOpen}
        />
      ) : null}
    </>
  );
}

type GroupFormValues = {
  label: string;
  emoji: string;
  color: string;
};

function GroupEditFields({
  control,
  setValue,
  isSubmitting,
  labelRef,
  onSubmit,
  t,
  showToast,
}: {
  control: Control<GroupFormValues>;
  setValue: UseFormSetValue<GroupFormValues>;
  isSubmitting: boolean;
  labelRef: RefObject<TextInput | null>;
  onSubmit: () => void;
  t: ReturnType<typeof useMobileTranslations>;
  showToast: ReturnType<typeof useAppToast>["showToast"];
}) {
  const emoji = useWatch({ control, name: "emoji" }) ?? "";
  const selectedColor = useWatch({ control, name: "color" }) ?? DEFAULT_GROUP_COLOR;

  return (
    <View style={styles.fields}>
      <View style={styles.pickerRow}>
        <EmojiPickerInput
          accessibilityLabel={t("EditEmojiLabel", { ns: "MobileGroups" })}
          compact
          disabled={isSubmitting}
          onChange={(next) => setValue("emoji", next, { shouldDirty: true, shouldValidate: true })}
          stretch
          value={emoji}
        />

        <ColorPickerInput
          accessibilityLabel={t("EditColorLabel", { ns: "MobileGroups" })}
          compact
          disabled={isSubmitting}
          onChange={(next) => setValue("color", next, { shouldDirty: true, shouldValidate: true })}
          showToast={showToast}
          stretch
          value={selectedColor}
        />
      </View>

      <SheetTextField
        control={control}
        editable={!isSubmitting}
        enterKeyHint="done"
        inputRef={labelRef}
        maxLength={GROUP_LABEL_MAX_LENGTH}
        name="label"
        onSubmitEditing={onSubmit}
        placeholder={t("EditLabelPlaceholder", { ns: "MobileGroups" })}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 12,
  },
  pickerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
});
