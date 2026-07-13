import type { Contact } from "@bondery/schemas";
import { updateContactIdentitySchema } from "@bondery/schemas";
import { IconBriefcase, IconCheck, IconTrash } from "@tabler/icons-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, type TextInput, View } from "react-native";
import {
  useCommonTranslations,
  useMobileContactIdentityTranslations,
} from "@/lib/i18n/generated/hooks";
import {
  ActionSheetPopup,
  type ActionSheetPopupAction,
} from "../../../components/ActionSheetPopup";
import { SheetTextField } from "../../../components/form";
import { fetchSettings } from "../../../lib/api/client";
import { INPUT_MAX_LENGTHS, UI_TIMING_MS } from "../../../lib/config";
import { updateContact } from "../../../lib/domains/contacts";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { ScalePressable } from "../../../theme/ScalePressable";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { getAvatarColorHex, getContactInitials } from "../contactUtils";
import { useContactPhotoUpload } from "../hooks/useContactPhotoUpload";
import { AvatarPhotoOverlayControls, avatarPhotoOverlayStyles } from "./AvatarPhotoOverlayControls";

interface EditIdentitySheetProps {
  contact: Contact;
  isMyselfMode?: boolean;
  onClose: () => void;
  onContactUpdated: (contact: Contact) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function EditIdentitySheet({
  open,
  contact,
  isMyselfMode = false,
  onOpenChange,
  onClose,
  onContactUpdated,
}: EditIdentitySheetProps) {
  const tMobileContactIdentity = useMobileContactIdentityTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const firstNameRef = useRef<TextInput>(null);

  // Keep a stable ref so callbacks like onAvatarUpdated never capture a stale contact.
  const contactRef = useRef(contact);
  contactRef.current = contact;

  const [avatarUri, setAvatarUri] = useState<string | null>(contact.avatar);

  const {
    control,
    handleSubmit,
    formState: { isDirty, isValid, isSubmitting },
  } = useSheetForm({
    getDefaultValues: () => ({
      firstName: contact.firstName ?? "",
      headline: contact.headline ?? "",
      lastName: contact.lastName ?? "",
      middleName: contact.middleName ?? "",
    }),
    mode: "onChange",
    open,
    schema: updateContactIdentitySchema,
  });

  // Reset avatar URI to the latest confirmed contact avatar each time the sheet opens.
  useEffect(() => {
    if (!open) {
      return;
    }
    setAvatarUri(contactRef.current.avatar);
  }, [open]);

  const {
    isPhotoBusy,
    isRemoveConfirmOpen,
    setRemoveConfirmOpen,
    choosePhotoFromLibrary,
    removePhoto,
  } = useContactPhotoUpload({
    contactId: contact.id,
    onAvatarUpdated: (url) => {
      setAvatarUri(url);
      onContactUpdated({ ...contactRef.current, avatar: url });
      if (isMyselfMode) {
        void fetchSettings();
      }
    },
  });

  // Auto-focus first field after the sheet animation settles.
  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = setTimeout(() => {
      firstNameRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);
    return () => clearTimeout(timer);
  }, [open]);

  const canSubmit = isValid && isDirty;
  const isBusy = isSubmitting || isPhotoBusy;
  const hasAvatar = Boolean(avatarUri);
  const initials = getContactInitials(contact);
  const avatarColor = getAvatarColorHex(contact);

  // Stable across renders within a theme — prevents avatar icon re-renders.
  const headlineLeadingIcon = useMemo(
    () => <IconBriefcase size={18} stroke={colors.iconSecondary} />,
    [colors.iconSecondary],
  );

  function requestClose() {
    if (isBusy) {
      return;
    }
    onClose();
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!canSubmit || isBusy) {
      return;
    }
    try {
      const updated = updateContact(contact.id, values, contact.updatedAt ?? undefined);
      onContactUpdated(updated);
      onClose();
    } catch (err) {
      showToast({
        description: err instanceof Error ? err.message : tMobileContactIdentity("SaveFailed"),
        headline: t("feedback.errorTitle"),
        type: "error",
      });
    }
  });

  const title = isMyselfMode
    ? tMobileContactIdentity("EditYourProfile")
    : tMobileContactIdentity("EditProfile");

  const primaryAction: ActionSheetPopupAction = {
    disabled: !canSubmit,
    icon: <IconCheck size={16} stroke={colors.textOnPrimary} />,
    label: tMobileContactIdentity("SaveChanges"),
    loading: isSubmitting,
    onPress: () => void onSubmit(),
    tone: "primary",
    variant: "filled",
  };

  return (
    <>
      <ActionSheetPopup
        actions={[primaryAction]}
        isBusy={isBusy}
        onClose={requestClose}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            requestClose();
            return;
          }
          onOpenChange(nextOpen);
        }}
        open={open}
        title={title}
      >
        <View style={styles.avatarSection}>
          <View style={avatarPhotoOverlayStyles.avatarFrame}>
            <ScalePressable
              accessibilityLabel={tMobileContactIdentity("ChangePhoto")}
              accessibilityRole="button"
              onPress={() => void choosePhotoFromLibrary()}
              opacity={isBusy ? 0.6 : 1}
              pointerEvents={isBusy ? "none" : "auto"}
              style={[styles.avatarCircle, !avatarUri && { backgroundColor: avatarColor }]}
            >
              {avatarUri ? (
                <Image resizeMode="cover" source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarInitial, { color: colors.textOnPrimary }]}>
                  {initials}
                </Text>
              )}
            </ScalePressable>

            <AvatarPhotoOverlayControls
              disabled={isBusy}
              onChangePhoto={() => void choosePhotoFromLibrary()}
              onRemovePhoto={() => setRemoveConfirmOpen(true)}
              showRemove={hasAvatar}
            />
          </View>
        </View>

        <SheetTextField
          accessibilityLabel={tMobileContactIdentity("FirstNameLabel")}
          control={control}
          editable={!isBusy}
          inputRef={firstNameRef}
          maxLength={INPUT_MAX_LENGTHS.firstName}
          name="firstName"
          placeholder={tMobileContactIdentity("FirstNameLabel")}
          returnKeyType="next"
        />

        <SheetTextField
          accessibilityLabel={tMobileContactIdentity("MiddleNameLabel")}
          control={control}
          editable={!isBusy}
          maxLength={INPUT_MAX_LENGTHS.middleName}
          name="middleName"
          placeholder={tMobileContactIdentity("MiddleNameLabel")}
          returnKeyType="next"
        />

        <SheetTextField
          accessibilityLabel={tMobileContactIdentity("LastNameLabel")}
          control={control}
          editable={!isBusy}
          maxLength={INPUT_MAX_LENGTHS.lastName}
          name="lastName"
          placeholder={tMobileContactIdentity("LastNameLabel")}
          returnKeyType="next"
        />

        <SheetTextField
          accessibilityLabel={tMobileContactIdentity("HeadlineLabel")}
          control={control}
          editable={!isBusy}
          leadingIcon={headlineLeadingIcon}
          maxLength={INPUT_MAX_LENGTHS.headline}
          name="headline"
          onSubmitEditing={() => void onSubmit()}
          placeholder={tMobileContactIdentity("HeadlineLabel")}
          returnKeyType="done"
        />
      </ActionSheetPopup>

      <ActionSheetPopup
        actions={[
          {
            disabled: isPhotoBusy,
            label: t("actions.cancel"),
            onPress: () => setRemoveConfirmOpen(false),
            tone: "neutral",
            variant: "outline",
          },
          {
            disabled: isPhotoBusy,
            icon: <IconTrash size={16} stroke={colors.textOnPrimary} />,
            label: tMobileContactIdentity("RemovePhoto"),
            loading: isPhotoBusy,
            onPress: () => void removePhoto(),
            tone: "danger",
            variant: "filled",
          },
        ]}
        isBusy={isPhotoBusy}
        onClose={() => setRemoveConfirmOpen(false)}
        onOpenChange={setRemoveConfirmOpen}
        open={isRemoveConfirmOpen}
        title={tMobileContactIdentity("RemovePhotoConfirmTitle")}
      />
    </>
  );
}

const styles = StyleSheet.create({
  avatarCircle: {
    alignItems: "center",
    borderRadius: 48,
    height: 96,
    justifyContent: "center",
    overflow: "hidden",
    width: 96,
  },
  avatarImage: {
    height: 96,
    width: 96,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 4,
  },
});
