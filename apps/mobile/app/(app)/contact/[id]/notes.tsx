import { useLocalSearchParams } from "expo-router";
import { ContactNotesEditor } from "../../../../src/features/contacts/ContactNotesEditor";

export default function ContactNotesPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ContactNotesEditor id={id} />;
}
