import { useLocalSearchParams } from "expo-router";
import { GroupContactsScreen } from "../../../src/features/contacts/GroupContactsScreen";

export default function GroupPage() {
  const { id, label, emoji } = useLocalSearchParams<{
    id: string;
    label: string;
    emoji: string;
  }>();
  return <GroupContactsScreen emoji={emoji ?? ""} groupId={id} label={label ?? ""} />;
}
