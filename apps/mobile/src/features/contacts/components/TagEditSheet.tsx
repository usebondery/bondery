import type { Tag } from "@bondery/schemas";
import { createTagSchema, GROUP_LABEL_MAX_LENGTH } from "@bondery/schemas";
import { IconCheck, IconTrash } from "@tabler/icons-react-native";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { type Control, type UseFormSetValue, useWatch } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import {
  useCommonTranslations,
  useMobileTagsTranslations,
  useTagsSettingsTranslations,
} from "@/lib/i18n/generated/hooks";
import {
  ColorPickerInput,
  DEFAULT_GROUP_COLOR,
  getRandomGroupColor,
} from "../../../components/color-picker";
import { SheetTextField } from "../../../components/form";
import { Sheet, type SheetAction } from "../../../components/ui/Sheet";
import { UI_TIMING_MS } from "../../../lib/config";
import { createTag, updateTag } from "../../../lib/domains/tags";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useSheetLocalSubmit } from "../../../lib/forms/useSheetLocalSubmit";
import type { NativeTextInputRef } from "../../../lib/native-host-refs";
import { notifications } from "../../../lib/toast/notifications";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { TagDeleteDialog } from "./TagDeleteDialog";

type TagFormValues = {
  label: string;
  color: string;
};

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
  const tMobileTags = useMobileTagsTranslations();
  const tTagsSettings = useTagsSettingsTranslations();
  const t = useCommonTranslations();
  const { mode, open, onOpenChange } = props;
  const editInitialLabel = mode === "edit" ? props.initialLabel : "";
  const editInitialColor =
    mode === "edit" ? props.initialColor || DEFAULT_GROUP_COLOR : DEFAULT_GROUP_COLOR;

  const colors = useMobileThemeColors();
  const labelRef = useRef<NativeTextInputRef>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isDirty, isValid },
  } = useSheetForm({
    getDefaultValues: () =>
      mode === "create"
        ? {
            color: getRandomGroupColor(),
            label: "",
          }
        : {
            color: editInitialColor,
            label: editInitialLabel,
          },
    mode: "onChange",
    open,
    schema: createTagSchema,
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

  const editTagId = mode === "edit" ? props.tagId : null;

  const handleCloseSheet = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSaveError = useCallback(() => {
    notifications.show({
      message: mode === "create" ? tMobileTags("CreateFailed") : tMobileTags("EditFailed"),
      title: t("feedback.errorTitle"),
      type: "error",
    });
  }, [mode, t, tMobileTags]);

  const performSave = useCallback(
    (values: TagFormValues) => {
      if (mode === "create") {
        return createTag({ color: values.color, label: values.label });
      }

      if (!editTagId) {
        throw new Error("Missing tag id");
      }

      return updateTag(editTagId, {
        color: values.color,
        label: values.label,
      });
    },
    [editTagId, mode],
  );

  const handleSaveSuccess = useCallback(
    (tag: Tag) => {
      if (mode === "create") {
        props.onCreated(tag);
        return;
      }
      props.onSaved(tag);
    },
    [mode, props],
  );

  const { isSubmitting, submit } = useSheetLocalSubmit(handleSubmit, {
    onClose: handleCloseSheet,
    onError: handleSaveError,
    onSuccess: handleSaveSuccess,
    perform: performSave,
  });

  const canSave =
    mode === "create" ? isValid && !isSubmitting : isDirty && isValid && !isSubmitting;

  const sheetTitle = mode === "create" ? tTagsSettings("CreateTitle") : tTagsSettings("EditTitle");
  const saveLabel = mode === "create" ? tTagsSettings("CreateButton") : tTagsSettings("SaveButton");

  const primaryAction: SheetAction = {
    disabled: !canSave,
    icon: <IconCheck size={16} stroke={colors.textOnPrimary} />,
    label: saveLabel,
    loading: isSubmitting,
    loadingText: t("feedback.saving"),
    onPress: submit,
    tone: "primary",
    variant: "filled",
  };

  const actions: [SheetAction] | [SheetAction, SheetAction] =
    mode === "edit"
      ? [
          {
            disabled: isSubmitting,
            icon: <IconTrash size={16} stroke={colors.textOnPrimary} />,
            label: tTagsSettings("DeleteButton"),
            onPress: () => setDeleteDialogOpen(true),
            tone: "danger",
            variant: "filled",
          },
          primaryAction,
        ]
      : [primaryAction];

  return (
    <>
      <Sheet
        actions={actions}
        isBusy={isSubmitting}
        onClose={() => onOpenChange(false)}
        opened={open}
        title={sheetTitle}
      >
        <TagColorLabelRow
          control={control}
          isSubmitting={isSubmitting}
          labelRef={labelRef}
          onSubmit={submit}
          setValue={setValue}
        />
      </Sheet>

      {mode === "edit" ? (
        <TagDeleteDialog
          onDeleted={() => {
            onOpenChange(false);
            props.onDeleted();
          }}
          onOpenChange={setDeleteDialogOpen}
          opened={isDeleteDialogOpen}
          tagId={props.tagId}
          tagLabel={editInitialLabel}
        />
      ) : null}
    </>
  );
}

function TagColorLabelRow({
  control,
  setValue,
  isSubmitting,
  labelRef,
  onSubmit,
}: {
  control: Control<TagFormValues>;
  setValue: UseFormSetValue<TagFormValues>;
  isSubmitting: boolean;
  labelRef: RefObject<NativeTextInputRef | null>;
  onSubmit: () => void;
}) {
  const tTagsSettings = useTagsSettingsTranslations();
  const selectedColor = useWatch({ control, name: "color" }) ?? DEFAULT_GROUP_COLOR;

  return (
    <View style={styles.labelRow}>
      <ColorPickerInput
        accessibilityLabel={tTagsSettings("ColorLabel")}
        compact
        disabled={isSubmitting}
        onChange={(next) => setValue("color", next, { shouldDirty: true, shouldValidate: true })}
        value={selectedColor}
      />

      <SheetTextField
        containerStyle={styles.labelInput}
        control={control}
        editable={!isSubmitting}
        enterKeyHint="done"
        inputRef={labelRef}
        maxLength={GROUP_LABEL_MAX_LENGTH}
        name="label"
        onSubmitEditing={onSubmit}
        placeholder={tTagsSettings("LabelPlaceholder")}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  labelInput: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
});
