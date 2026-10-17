import { getRandomEmoji } from "@bondery/helpers/emoji";
import type { Group } from "@bondery/schemas";
import { createGroupSchema, GROUP_LABEL_MAX_LENGTH } from "@bondery/schemas";
import { IconCheck, IconTrash } from "@tabler/icons-react-native";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { type Control, type UseFormSetValue, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import {
  useCommonTranslations,
  useMobileEmojiPickerTranslations,
  useMobileGroupsTranslations,
} from "@/lib/i18n/generated/hooks";
import {
  ColorPickerInput,
  DEFAULT_GROUP_COLOR,
  getRandomGroupColor,
} from "../../../components/color-picker";
import { EmojiPickerInput } from "../../../components/emoji-picker";
import { SheetTextField } from "../../../components/form";
import { ActionButtonShellPressable } from "../../../components/ui/ActionButtonShellPressable";
import { BottomSheetScrollView, Sheet, type SheetAction } from "../../../components/ui/Sheet";
import { UI_TIMING_MS } from "../../../lib/config";
import { createGroup, updateGroup } from "../../../lib/domains/groups";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useSheetLocalSubmit } from "../../../lib/forms/useSheetLocalSubmit";
import type { NativeTextInputRef } from "../../../lib/native-host-refs";
import { notifications } from "../../../lib/toast/notifications";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { GroupDeleteDialog } from "./GroupDeleteDialog";

type GroupFormValues = {
  label: string;
  emoji: string;
  color: string;
};

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
  const tMobileGroups = useMobileGroupsTranslations();
  const t = useCommonTranslations();
  const { mode, open, onOpenChange } = props;
  const editInitialLabel = mode === "edit" ? props.initialLabel : "";
  const editInitialEmoji = mode === "edit" ? props.initialEmoji : "";
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

  const handleCloseSheet = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSaveError = useCallback(() => {
    notifications.show({
      message: mode === "create" ? tMobileGroups("CreateFailed") : tMobileGroups("EditFailed"),
      title: t("feedback.errorTitle"),
      type: "error",
    });
  }, [mode, t, tMobileGroups]);

  const editGroupId = mode === "edit" ? props.groupId : null;

  const performSave = useCallback(
    (values: GroupFormValues) => {
      if (mode === "create") {
        return createGroup({
          color: values.color,
          emoji: values.emoji,
          label: values.label,
        });
      }

      if (!editGroupId) {
        throw new Error("Missing group id");
      }

      return updateGroup(editGroupId, {
        color: values.color,
        emoji: values.emoji,
        label: values.label,
      });
    },
    [editGroupId, mode],
  );

  const handleSaveSuccess = useCallback(
    (group: Group) => {
      if (mode === "create") {
        props.onCreated(group);
        return;
      }
      props.onSaved(group);
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

  const sheetTitle =
    mode === "create" ? tMobileGroups("CreateSheetTitle") : tMobileGroups("EditSheetTitle");
  const saveLabel = mode === "create" ? tMobileGroups("CreateSave") : tMobileGroups("EditSave");

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
            label: tMobileGroups("DeleteGroup"),
            onPress: () => setDeleteDialogOpen(true),
            tone: "danger",
            variant: "filled",
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
      <Sheet
        actions={actions}
        isBusy={isSubmitting}
        onClose={() => onOpenChange(false)}
        opened={open}
        snapPoint="fit"
        title={sheetTitle}
      >
        <BottomSheetScrollView keyboardShouldPersistTaps="handled">
          <GroupEditFields
            control={control}
            isSubmitting={isSubmitting}
            labelRef={labelRef}
            onSubmit={submit}
            setValue={setValue}
          />
        </BottomSheetScrollView>
      </Sheet>

      {mode === "edit" ? (
        <GroupDeleteDialog
          groupId={props.groupId}
          groupTitle={deleteDialogTitle}
          onDeleted={() => {
            onOpenChange(false);
            props.onDeleted();
          }}
          onOpenChange={setDeleteDialogOpen}
          opened={isDeleteDialogOpen}
        />
      ) : null}
    </>
  );
}

function GroupEditFields({
  control,
  setValue,
  isSubmitting,
  labelRef,
  onSubmit,
}: {
  control: Control<GroupFormValues>;
  setValue: UseFormSetValue<GroupFormValues>;
  isSubmitting: boolean;
  labelRef: RefObject<NativeTextInputRef | null>;
  onSubmit: () => void;
}) {
  const tMobileGroups = useMobileGroupsTranslations();
  const tMobileEmojiPicker = useMobileEmojiPickerTranslations();
  const emoji = useWatch({ control, name: "emoji" }) ?? "";
  const selectedColor = useWatch({ control, name: "color" }) ?? DEFAULT_GROUP_COLOR;

  const handleRandomAppearance = () => {
    setValue("emoji", getRandomEmoji(), { shouldDirty: true, shouldValidate: true });
    setValue("color", getRandomGroupColor(), { shouldDirty: true, shouldValidate: true });
  };

  return (
    <View style={styles.fields}>
      <View style={styles.pickerRow}>
        <EmojiPickerInput
          accessibilityLabel={tMobileGroups("EditEmojiLabel")}
          compact
          disabled={isSubmitting}
          onChange={(next) => setValue("emoji", next, { shouldDirty: true, shouldValidate: true })}
          stretch
          value={emoji}
        />

        <ColorPickerInput
          accessibilityLabel={tMobileGroups("EditColorLabel")}
          compact
          disabled={isSubmitting}
          onChange={(next) => setValue("color", next, { shouldDirty: true, shouldValidate: true })}
          stretch
          value={selectedColor}
        />

        <ActionButtonShellPressable
          accessibilityLabel={tMobileEmojiPicker("RandomAccessibilityLabel")}
          disabled={isSubmitting}
          matchInputChrome
          onPress={handleRandomAppearance}
          variant="outline"
        >
          <Text style={styles.randomDice}>🎲</Text>
        </ActionButtonShellPressable>
      </View>

      <SheetTextField
        control={control}
        editable={!isSubmitting}
        enterKeyHint="done"
        inputRef={labelRef}
        maxLength={GROUP_LABEL_MAX_LENGTH}
        name="label"
        onSubmitEditing={onSubmit}
        placeholder={tMobileGroups("EditLabelPlaceholder")}
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
  randomDice: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
  },
});
