import { useEffect, useRef, useState, type RefObject } from "react";
import { StyleSheet, type TextInput, View } from "react-native";
import { useWatch, type Control, type UseFormSetValue } from "react-hook-form";
import { IconCheck, IconTrash } from "@tabler/icons-react-native";
import { getRandomEmoji } from "@bondery/helpers/emoji";
import type { Group } from "@bondery/schemas";
import {
  createGroupSchema,
  GROUP_LABEL_MAX_LENGTH,
} from "@bondery/schemas";
import { ActionSheetPopup, type ActionSheetPopupAction } from "../../../components/ActionSheetPopup";
import { SheetTextField } from "../../../components/form";
import {
  ColorPickerInput,
  DEFAULT_GROUP_COLOR,
  getRandomGroupColor,
} from "../../../components/color-picker";
import { EmojiPickerInput } from "../../../components/emoji-picker";
import { createGroup, updateGroup } from "../../../lib/api/client";
import { UI_TIMING_MS } from "../../../lib/config";
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
    open,
    schema: createGroupSchema,
    getDefaultValues: () =>
      mode === "create"
        ? {
            label: "",
            emoji: getRandomEmoji(),
            color: getRandomGroupColor(),
          }
        : {
            label: editInitialLabel,
            emoji: editInitialEmoji,
            color: editInitialColor,
          },
    mode: "onChange",
  });
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      labelRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);

    return () => clearTimeout(timer);
  }, [open, mode === "edit" ? props.groupId : "create"]);

  const canSave =
    mode === "create"
      ? isValid && !isSubmitting
      : isDirty && isValid && !isSubmitting;

  const onSubmit = handleSubmit(async (values) => {
    if (!canSave) return;
    try {
      if (mode === "create") {
        const { group } = await createGroup({
          label: values.label,
          emoji: values.emoji,
          color: values.color,
        });
        onOpenChange(false);
        props.onCreated(group);
        return;
      }

      const { group } = await updateGroup(props.groupId, {
        label: values.label,
        emoji: values.emoji,
        color: values.color,
      });

      onOpenChange(false);
      props.onSaved(group);
    } catch {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description:
          mode === "create"
            ? t("MobileApp.Groups.CreateFailed")
            : t("MobileApp.Groups.EditFailed"),
      });
    }
  });

  const sheetTitle =
    mode === "create"
      ? t("MobileApp.Groups.CreateSheetTitle")
      : t("MobileApp.Groups.EditSheetTitle");
  const saveLabel =
    mode === "create" ? t("MobileApp.Groups.CreateSave") : t("MobileApp.Groups.EditSave");

  const primaryAction: ActionSheetPopupAction = {
    label: saveLabel,
    icon: <IconCheck size={16} stroke={colors.textOnPrimary} />,
    onPress: () => void onSubmit(),
    disabled: !canSave,
    loading: isSubmitting,
    tone: "primary",
    variant: "filled",
  };

  const actions: [ActionSheetPopupAction] | [ActionSheetPopupAction, ActionSheetPopupAction] =
    mode === "edit"
      ? [
          {
            label: t("MobileApp.Groups.DeleteGroup"),
            icon: <IconTrash size={16} stroke={colors.dangerAccent} />,
            onPress: () => setDeleteDialogOpen(true),
            disabled: isSubmitting,
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
        open={open}
        title={sheetTitle}
        actions={actions}
        onOpenChange={onOpenChange}
        onClose={() => onOpenChange(false)}
        isBusy={isSubmitting}
      >
      <GroupEditFields
        control={control}
        setValue={setValue}
        isSubmitting={isSubmitting}
        labelRef={labelRef}
        onSubmit={() => void onSubmit()}
        t={t}
        showToast={showToast}
      />
    </ActionSheetPopup>

      {mode === "edit" ? (
        <GroupDeleteDialog
          open={isDeleteDialogOpen}
          groupId={props.groupId}
          groupTitle={deleteDialogTitle}
          onOpenChange={setDeleteDialogOpen}
          onDeleted={() => {
            onOpenChange(false);
            props.onDeleted();
          }}
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
          value={emoji}
          onChange={(next) =>
            setValue("emoji", next, { shouldDirty: true, shouldValidate: true })
          }
          compact
          stretch
          disabled={isSubmitting}
          accessibilityLabel={t("MobileApp.Groups.EditEmojiLabel")}
        />

        <ColorPickerInput
          value={selectedColor}
          onChange={(next) =>
            setValue("color", next, { shouldDirty: true, shouldValidate: true })
          }
          compact
          stretch
          disabled={isSubmitting}
          accessibilityLabel={t("MobileApp.Groups.EditColorLabel")}
          showToast={showToast}
        />
      </View>

      <SheetTextField
        control={control}
        name="label"
        inputRef={labelRef}
        placeholder={t("MobileApp.Groups.EditLabelPlaceholder")}
        editable={!isSubmitting}
        returnKeyType="done"
        enterKeyHint="done"
        onSubmitEditing={onSubmit}
        maxLength={GROUP_LABEL_MAX_LENGTH}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 12,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
});
