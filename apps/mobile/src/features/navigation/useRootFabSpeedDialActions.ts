import { IconUserPlus } from "@tabler/icons-react-native";
import { useMemo } from "react";
import { useCreateContactSheet } from "../contacts/createContactSheetContext";
import type { FabSpeedDialAction } from "./fabSpeedDialTypes";

export function useRootFabSpeedDialActions(): FabSpeedDialAction[] {
  const { openCreateContact } = useCreateContactSheet();

  return useMemo(
    () => [
      {
        icon: IconUserPlus,
        id: "create-person",
        labelKey: "CreatePerson",
        labelNamespace: "MobileNavigation",
        onPress: openCreateContact,
        testID: "fab-create-person",
      },
    ],
    [openCreateContact],
  );
}
