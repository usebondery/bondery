import type { Contact, Group } from "@bondery/schemas";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { addContactsToGroup, createGroup } from "../../../lib/domains/groups";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { getGroup } from "../../../lib/sync/hooks/useSyncQuery";
import { useAppToast } from "../../../lib/toast/useAppToast";

interface UseGroupScreenActionsOptions {
  contacts: Contact[];
  groupId: string;
  initialEmoji: string;
  initialLabel: string;
}

export function useGroupScreenActions({
  contacts,
  groupId,
  initialEmoji,
  initialLabel,
}: UseGroupScreenActionsOptions) {
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const router = useRouter();
  const [localLabel, setLocalLabel] = useState(initialLabel);
  const [localEmoji, setLocalEmoji] = useState(initialEmoji);
  const [groupDetails, setGroupDetails] = useState<Group | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const navigateToGroup = useCallback(
    (group: Group) => {
      router.navigate({
        params: {
          emoji: group.emoji || "",
          id: group.id,
          label: group.label,
        },
        pathname: "/group/[id]",
      });
    },
    [router],
  );

  const ensureGroupDetails = useCallback((): Group => {
    if (groupDetails) {
      return groupDetails;
    }

    const group = getGroup(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    setGroupDetails(group);
    return group;
  }, [groupDetails, groupId]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleOpenEditGroup = useCallback(() => {
    try {
      ensureGroupDetails();
    } catch {
      showToast({
        description: t("errors.unknown", { ns: "common" }),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
      });
      return;
    }
    setIsEditSheetOpen(true);
  }, [ensureGroupDetails, showToast, t]);

  const handleGroupSaved = useCallback((group: Group) => {
    setLocalLabel(group.label);
    setLocalEmoji(group.emoji ?? "");
    setGroupDetails(group);
  }, []);

  const handleConfirmDuplicateGroup = useCallback(async () => {
    if (isDuplicating) {
      return;
    }

    setIsDuplicating(true);

    try {
      const details = ensureGroupDetails();
      const newGroup = createGroup({
        color: details.color ?? "",
        emoji: details.emoji?.trim() || "📁",
        label: `${details.label} (copy)`,
      });

      if (contacts.length > 0) {
        addContactsToGroup(
          newGroup.id,
          contacts.map((c) => c.id),
        );
      }

      setIsDuplicateDialogOpen(false);
      navigateToGroup(newGroup);
    } catch {
      showToast({
        description: t("DuplicateFailed", { ns: "MobileGroups" }),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
      });
    } finally {
      setIsDuplicating(false);
    }
  }, [contacts, ensureGroupDetails, isDuplicating, navigateToGroup, showToast, t]);

  const duplicateDialogTitle = t("DuplicateDialogTitle", { ns: "MobileGroups" }).replace(
    "{title}",
    localEmoji ? `${localEmoji} ${localLabel}` : localLabel,
  );

  return {
    duplicateDialogTitle,
    groupDetails,
    handleBack,
    handleConfirmDuplicateGroup,
    handleGroupSaved,
    handleOpenEditGroup,
    isDeleteDialogOpen,
    isDuplicateDialogOpen,
    isDuplicating,
    isEditSheetOpen,
    localEmoji,
    localLabel,
    setIsDeleteDialogOpen,
    setIsDuplicateDialogOpen,
    setIsEditSheetOpen,
  };
}
