import { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, View, type TextInput } from "react-native";
import { IconBriefcase, IconCheck, IconTrash } from "@tabler/icons-react-native";
import type { Contact } from "@bondery/schemas";
import { ActionSheetPopup, type ActionSheetPopupAction } from "../../../components/ActionSheetPopup";
import { SheetTextField } from "../../../components/form";
import { INPUT_MAX_LENGTHS, UI_TIMING_MS } from "../../../lib/config";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { updateContactIdentitySchema } from "@bondery/schemas";
import { fetchSettings } from "../../../lib/api/client";
import { contactsDomain } from "../../../lib/domains/contacts";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { ScalePressable } from "../../../theme/ScalePressable";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { getAvatarColorHex, getContactInitials } from "../contactUtils";
import { useContactPhotoUpload } from "../hooks/useContactPhotoUpload";
import {
  AvatarPhotoOverlayControls,
  avatarPhotoOverlayStyles,
} from "./AvatarPhotoOverlayControls";

interface EditIdentitySheetProps {
  open: boolean;
  contact: Contact;
  isMyselfMode?: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onContactUpdated: (contact: Contact) => void;
}

export function EditIdentitySheet({
  open,
  contact,
  isMyselfMode = false,
  onOpenChange,
  onClose,
  onContactUpdated,
}: EditIdentitySheetProps) {
  const t = useMobileTranslations();
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
    open,
    schema: updateContactIdentitySchema,
    getDefaultValues: () => ({
      firstName: contact.firstName ?? "",
      middleName: contact.middleName ?? "",
      lastName: contact.lastName ?? "",
      headline: contact.headline ?? "",
    }),
    mode: "onChange",
  });

  // Reset avatar URI to the latest confirmed contact avatar each time the sheet opens.
  useEffect(() => {
    if (!open) return;
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
    if (!open) return;
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
    if (isBusy) return;
    onClose();
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!canSubmit || isBusy) return;
    try {
      const updated = contactsDomain.update(contact.id, values, contact.updatedAt ?? undefined);
      onContactUpdated(updated);
      onClose();
    } catch (err) {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description:
          err instanceof Error ? err.message : t("MobileApp.ContactIdentity.SaveFailed"),
      });
    }
  });

  const title = isMyselfMode
    ? t("MobileApp.ContactIdentity.EditYourProfile")
    : t("MobileApp.ContactIdentity.EditProfile");

  const primaryAction: ActionSheetPopupAction = {
    label: t("MobileApp.ContactIdentity.SaveChanges"),
    icon: <IconCheck size={16} stroke={colors.textOnPrimary} />,
    onPress: () => void onSubmit(),
    disabled: !canSubmit,
    loading: isSubmitting,
    tone: "primary",
    variant: "filled",
  };

  return (
    <>
      <ActionSheetPopup
        open={open}
        title={title}
        actions={[primaryAction]}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            requestClose();
            return;
          }
          onOpenChange(nextOpen);
        }}
        onClose={requestClose}
        isBusy={isBusy}
      >
        <View style={styles.avatarSection}>
          <View style={avatarPhotoOverlayStyles.avatarFrame}>
            <ScalePressable
              accessibilityRole="button"
              accessibilityLabel={t("MobileApp.ContactIdentity.ChangePhoto")}
              pointerEvents={isBusy ? "none" : "auto"}
              opacity={isBusy ? 0.6 : 1}
              onPress={() => void choosePhotoFromLibrary()}
              style={[
                styles.avatarCircle,
                !avatarUri && { backgroundColor: avatarColor },
              ]}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={[styles.avatarInitial, { color: colors.textOnPrimary }]}>
                  {initials}
                </Text>
              )}
            </ScalePressable>

            <AvatarPhotoOverlayControls
              showRemove={hasAvatar}
              disabled={isBusy}
              onChangePhoto={() => void choosePhotoFromLibrary()}
              onRemovePhoto={() => setRemoveConfirmOpen(true)}
            />
          </View>
        </View>

        <SheetTextField
          control={control}
          name="firstName"
          inputRef={firstNameRef}
          accessibilityLabel={t("MobileApp.ContactIdentity.FirstNameLabel")}
          placeholder={t("MobileApp.ContactIdentity.FirstNameLabel")}
          maxLength={INPUT_MAX_LENGTHS.firstName}
          editable={!isBusy}
          returnKeyType="next"
        />

        <SheetTextField
          control={control}
          name="middleName"
          accessibilityLabel={t("MobileApp.ContactIdentity.MiddleNameLabel")}
          placeholder={t("MobileApp.ContactIdentity.MiddleNameLabel")}
          maxLength={INPUT_MAX_LENGTHS.middleName}
          editable={!isBusy}
          returnKeyType="next"
        />

        <SheetTextField
          control={control}
          name="lastName"
          accessibilityLabel={t("MobileApp.ContactIdentity.LastNameLabel")}
          placeholder={t("MobileApp.ContactIdentity.LastNameLabel")}
          maxLength={INPUT_MAX_LENGTHS.lastName}
          editable={!isBusy}
          returnKeyType="next"
        />

        <SheetTextField
          control={control}
          name="headline"
          accessibilityLabel={t("MobileApp.ContactIdentity.HeadlineLabel")}
          placeholder={t("MobileApp.ContactIdentity.HeadlineLabel")}
          maxLength={INPUT_MAX_LENGTHS.headline}
          editable={!isBusy}
          leadingIcon={headlineLeadingIcon}
          returnKeyType="done"
          onSubmitEditing={() => void onSubmit()}
        />
      </ActionSheetPopup>

      <ActionSheetPopup
        open={isRemoveConfirmOpen}
        title={t("MobileApp.ContactIdentity.RemovePhotoConfirmTitle")}
        isBusy={isPhotoBusy}
        onOpenChange={setRemoveConfirmOpen}
        onClose={() => setRemoveConfirmOpen(false)}
        actions={[
          {
            label: t("MobileApp.Common.Cancel"),
            onPress: () => setRemoveConfirmOpen(false),
            disabled: isPhotoBusy,
            tone: "neutral",
            variant: "outline",
          },
          {
            label: t("MobileApp.ContactIdentity.RemovePhoto"),
            icon: <IconTrash size={16} stroke={colors.textOnPrimary} />,
            onPress: () => void removePhoto(),
            loading: isPhotoBusy,
            disabled: isPhotoBusy,
            tone: "danger",
            variant: "filled",
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: "center",
    marginBottom: 4,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 96,
    height: 96,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
});
