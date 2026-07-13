import type { Tag } from "@bondery/schemas";
import { createTagSchema, GROUP_LABEL_MAX_LENGTH } from "@bondery/schemas";
import { IconCheck, IconTrash } from "@tabler/icons-react-native";
import { type RefObject, useEffect, useRef, useState } from "react";
import { type Control, type UseFormSetValue, useWatch } from "react-hook-form";
import { StyleSheet, type TextInput, View } from "react-native";
import {
  useCommonTranslations,
  useMobileTagsTranslations,
  useTagsSettingsTranslations,
} from "@/lib/i18n/generated/hooks";
import {
  ActionSheetPopup,
  type ActionSheetPopupAction,
} from "../../../components/ActionSheetPopup";
import {
  ColorPickerInput,
  DEFAULT_GROUP_COLOR,
  getRandomGroupColor,
} from "../../../components/color-picker";
import { SheetTextField } from "../../../components/form";
import { UI_TIMING_MS } from "../../../lib/config";
import { createTag, updateTag } from "../../../lib/domains/tags";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
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
  const tMobileTags = useMobileTagsTranslations();
  const tTagsSettings = useTagsSettingsTranslations();
  const t = useCommonTranslations();
  const { mode, open, onOpenChange } = props;
  const editInitialLabel = mode === "edit" ? props.initialLabel : "";
  const editInitialColor =
    mode === "edit" ? props.initialColor || DEFAULT_GROUP_COLOR : DEFAULT_GROUP_COLOR;

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

  const canSave =
    mode === "create" ? isValid && !isSubmitting : isDirty && isValid && !isSubmitting;

  const onSubmit = handleSubmit(async (values) => {
    if (!canSave) {
      return;
    }
    try {
      if (mode === "create") {
        const finalTag = createTag({ color: values.color, label: values.label });
        onOpenChange(false);
        props.onCreated(finalTag);
        return;
      }

      const updated = updateTag(props.tagId, {
        color: values.color,
        label: values.label,
      });

      onOpenChange(false);
      props.onSaved(updated);
    } catch {
      showToast({
        description: mode === "create" ? tMobileTags("CreateFailed") : tMobileTags("EditFailed"),
        headline: t("feedback.errorTitle"),
        type: "error",
      });
    }
  });

  const sheetTitle = mode === "create" ? tTagsSettings("CreateTitle") : tTagsSettings("EditTitle");
  const saveLabel = mode === "create" ? tTagsSettings("CreateButton") : tTagsSettings("SaveButton");

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
            label: tTagsSettings("DeleteButton"),
            onPress: () => setDeleteDialogOpen(true),
            tone: "danger",
            variant: "outline",
          },
          primaryAction,
        ]
      : [primaryAction];

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
        <TagColorLabelRow
          control={control}
          isSubmitting={isSubmitting}
          labelRef={labelRef}
          onSubmit={() => void onSubmit()}
          setValue={setValue}
          showToast={showToast}
        />
      </ActionSheetPopup>

      {mode === "edit" ? (
        <TagDeleteDialog
          onDeleted={() => {
            onOpenChange(false);
            props.onDeleted();
          }}
          onOpenChange={setDeleteDialogOpen}
          open={isDeleteDialogOpen}
          tagId={props.tagId}
          tagLabel={editInitialLabel}
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
  showToast,
}: {
  control: Control<TagFormValues>;
  setValue: UseFormSetValue<TagFormValues>;
  isSubmitting: boolean;
  labelRef: RefObject<TextInput | null>;
  onSubmit: () => void;
  showToast: ReturnType<typeof useAppToast>["showToast"];
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
        showToast={showToast}
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
