import { useLocalSearchParams } from "expo-router";
import { ContactDetailScreen } from "../../src/features/contacts/ContactDetailScreen";

export default function ContactDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ContactDetailScreen id={id} />;
}
