"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import type { RelationshipType } from "@bondery/schemas";
import type { TranslateFn } from "@bondery/translations";
import { notifications } from "@mantine/notifications";
import { useCallback, useState } from "react";
import type {
  useCreateContactRelationshipMutation,
  useDeleteContactRelationshipMutation,
  useUpdateContactRelationshipMutation,
} from "@/lib/query/hooks/useContacts";

type CreateRelationshipMutation = ReturnType<typeof useCreateContactRelationshipMutation>;
type UpdateRelationshipMutation = ReturnType<typeof useUpdateContactRelationshipMutation>;
type DeleteRelationshipMutation = ReturnType<typeof useDeleteContactRelationshipMutation>;

interface UsePersonRelationshipHandlersOptions {
  createRelationshipMutation: CreateRelationshipMutation;
  deleteRelationshipMutation: DeleteRelationshipMutation;
  tCommon: TranslateFn<"common">;
  tRelationships: TranslateFn<"PersonRelationships">;
  updateRelationshipMutation: UpdateRelationshipMutation;
}

export function usePersonRelationshipHandlers({
  tCommon,
  tRelationships,
  createRelationshipMutation,
  deleteRelationshipMutation,
  updateRelationshipMutation,
}: UsePersonRelationshipHandlersOptions) {
  const [relationshipsSaving, setRelationshipsSaving] = useState(false);

  const handleAddRelationship = useCallback(
    async (relationshipType: RelationshipType, relatedPersonId: string) => {
      setRelationshipsSaving(true);

      try {
        await createRelationshipMutation.mutateAsync({ relatedPersonId, relationshipType });

        notifications.show(
          successNotificationTemplate({
            description: tRelationships("CreateSuccess"),
            title: tRelationships("SuccessTitle"),
          }),
        );
      } catch (error) {
        notifications.show(
          errorNotificationTemplate({
            description: getUserFacingError(error, tCommon),
            title: tRelationships("ErrorTitle"),
          }),
        );
      } finally {
        setRelationshipsSaving(false);
      }
    },
    [createRelationshipMutation, tCommon, tRelationships],
  );

  const handleDeleteRelationship = useCallback(
    async (relationshipId: string) => {
      setRelationshipsSaving(true);

      try {
        await deleteRelationshipMutation.mutateAsync(relationshipId);

        notifications.show(
          successNotificationTemplate({
            description: tRelationships("DeleteSuccess"),
            title: tRelationships("SuccessTitle"),
          }),
        );
      } catch (error) {
        notifications.show(
          errorNotificationTemplate({
            description: getUserFacingError(error, tCommon),
            title: tRelationships("ErrorTitle"),
          }),
        );
      } finally {
        setRelationshipsSaving(false);
      }
    },
    [deleteRelationshipMutation, tCommon, tRelationships],
  );

  const handleUpdateRelationship = useCallback(
    async (relationshipId: string, relationshipType: RelationshipType, relatedPersonId: string) => {
      setRelationshipsSaving(true);

      try {
        await updateRelationshipMutation.mutateAsync({
          input: {
            relatedPersonId,
            relationshipType,
          },
          relationshipId,
        });

        notifications.show(
          successNotificationTemplate({
            description: tRelationships("UpdateSuccess"),
            title: tRelationships("SuccessTitle"),
          }),
        );
      } catch (error) {
        notifications.show(
          errorNotificationTemplate({
            description: getUserFacingError(error, tCommon),
            title: tRelationships("ErrorTitle"),
          }),
        );
      } finally {
        setRelationshipsSaving(false);
      }
    },
    [tCommon, tRelationships, updateRelationshipMutation],
  );

  return {
    handleAddRelationship,
    handleDeleteRelationship,
    handleUpdateRelationship,
    relationshipsSaving,
  };
}
