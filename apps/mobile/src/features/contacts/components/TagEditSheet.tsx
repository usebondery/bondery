import { useEffect, useRef, useState, type RefObject } from "react";
import { StyleSheet, type TextInput, View } from "react-native";
import { useWatch, type Control, type UseFormSetValue } from "react-hook-form";
import { IconCheck, IconTrash } from "@tabler/icons-react-native";
import type { Tag } from "@bondery/schemas";
import {
  createTagSchema,
  GROUP_LABEL_MAX_LENGTH,
} from "@bondery/schemas";
import { ActionSheetPopup, type ActionSheetPopupAction } from "../../../components/ActionSheetPopup";
import { SheetTextField } from "../../../components/form";
import {
  ColorPickerInput,
  DEFAULT_GROUP_COLOR,
  getRandomGroupColor,
} from "../../../components/color-picker";
import { createTag, updateTag } from "../../../lib/api/client";
import { UI_TIMING_MS } from "../../../lib/config";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { TagDeleteDialog } from "./TagDeleteDialog";

type TagEditSheetProps =
  | {
      mode: "create";
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onCreated: (tag: Tag) => void;
    }
  | {
      mode: "edit";
      open: boolean;
      tagId: string;
      initialLabel: string;
      initialColor: string;
      onOpenChange: (open: boolean) => void;
      onSaved: (tag: Tag) => void;
      onDeleted: () => void;
    };

export function TagEditSheet(props: TagEditSheetProps) {
  const { mode, open, onOpenChange } = props;
  const editInitialLabel = mode === "edit" ? props.initialLabel : "";
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
    schema: createTagSchema,
    getDefaultValues: () =>
      mode === "create"
        ? {
            label: "",
            color: getRandomGroupColor(),
          }
        : {
            label: editInitialLabel,
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
  }, [open, mode === "edit" ? props.tagId : "create"]);

  const canSave =
    mode === "create"
      ? isValid && !isSubmitting
      : isDirty && isValid && !isSubmitting;

  const onSubmit = handleSubmit(async (values) => {
    if (!canSave) return;
    try {
      if (mode === "create") {
        const { tag: created } = await createTag({ label: values.label });
        let finalTag = created;

        if (values.color && created.color !== values.color) {
          const { tag: updated } = await updateTag(created.id, { color: values.color });
          finalTag = updated;
        }

        onOpenChange(false);
        props.onCreated(finalTag);
        return;
      }

      const { tag: updated } = await updateTag(props.tagId, {
        label: values.label,
        color: values.color,
      });

      onOpenChange(false);
      props.onSaved(updated);
    } catch {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description:
          mode === "create" ? t("MobileApp.Tags.CreateFailed") : t("MobileApp.Tags.EditFailed"),
      });
    }
  });

  const sheetTitle =
    mode === "create"
      ? t("MobileApp.TagsSettings.CreateTitle")
      : t("MobileApp.TagsSettings.EditTitle");
  const saveLabel =
    mode === "create"
      ? t("MobileApp.TagsSettings.CreateButton")
      : t("MobileApp.TagsSettings.SaveButton");

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
            label: t("MobileApp.TagsSettings.DeleteButton"),
            icon: <IconTrash size={16} stroke={colors.dangerAccent} />,
            onPress: () => setDeleteDialogOpen(true),
            disabled: isSubmitting,
            tone: "danger",
            variant: "outline",
          },
          primaryAction,
        ]
      : [primaryAction];

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
        <TagColorLabelRow
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
        <TagDeleteDialog
          open={isDeleteDialogOpen}
          tagId={props.tagId}
          tagLabel={editInitialLabel}
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

type TagFormValues = {
  label: string;
  color: string;
};

function TagColorLabelRow({
  control,
  setValue,
  isSubmitting,
  labelRef,
  onSubmit,
  t,
  showToast,
}: {
  control: Control<TagFormValues>;
  setValue: UseFormSetValue<TagFormValues>;
  isSubmitting: boolean;
  labelRef: RefObject<TextInput | null>;
  onSubmit: () => void;
  t: ReturnType<typeof useMobileTranslations>;
  showToast: ReturnType<typeof useAppToast>["showToast"];
}) {
  const selectedColor = useWatch({ control, name: "color" }) ?? DEFAULT_GROUP_COLOR;

  return (
    <View style={styles.labelRow}>
      <ColorPickerInput
        value={selectedColor}
        onChange={(next) =>
          setValue("color", next, { shouldDirty: true, shouldValidate: true })
        }
        compact
        disabled={isSubmitting}
        accessibilityLabel={t("MobileApp.TagsSettings.ColorLabel")}
        showToast={showToast}
      />

      <SheetTextField
        control={control}
        name="label"
        inputRef={labelRef}
        placeholder={t("MobileApp.TagsSettings.LabelPlaceholder")}
        editable={!isSubmitting}
        returnKeyType="done"
        enterKeyHint="done"
        onSubmitEditing={onSubmit}
        maxLength={GROUP_LABEL_MAX_LENGTH}
        containerStyle={styles.labelInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  labelInput: {
    flex: 1,
    minWidth: 0,
  },
});
