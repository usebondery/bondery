import { IconUserPlus } from "@tabler/icons-react-native";
import { useMemo } from "react";
import { useCreateContactSheet } from "../contacts/createContactSheetContext";
import type { FabSpeedDialAction } from "./fabSpeedDialTypes";

export function useRootFabSpeedDialActions(): FabSpeedDialAction[] {
  const { openCreateContact } = useCreateContactSheet();

  return useMemo(
    () => [
      {
        id: "create-person",
        labelKey: "MobileApp.Navigation.CreatePerson",
        icon: IconUserPlus,
        onPress: openCreateContact,
        testID: "fab-create-person",
      },
    ],
    [openCreateContact],
  );
}
