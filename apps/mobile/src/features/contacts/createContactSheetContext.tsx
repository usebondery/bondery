import type { Contact } from "@bondery/schemas";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { CreateContactSheet } from "./components/CreateContactSheet";

interface CreateContactSheetContextValue {
  contactsListVersion: number;
  openCreateContact: () => void;
}

const CreateContactSheetContext = createContext<CreateContactSheetContextValue | null>(null);

export function CreateContactSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [contactsListVersion, setContactsListVersion] = useState(0);

  const openCreateContact = useCallback(() => {
    setOpen(true);
  }, []);

  const handleCreated = useCallback((_contact: Contact) => {
    setContactsListVersion((version) => version + 1);
  }, []);

  const value = useMemo(
    () => ({
      contactsListVersion,
      openCreateContact,
    }),
    [contactsListVersion, openCreateContact],
  );

  return (
    <CreateContactSheetContext.Provider value={value}>
      {children}
      <CreateContactSheet onCreated={handleCreated} onOpenChange={setOpen} open={open} />
    </CreateContactSheetContext.Provider>
  );
}

export function useCreateContactSheet() {
  const context = useContext(CreateContactSheetContext);

  if (!context) {
    throw new Error("useCreateContactSheet must be used within CreateContactSheetProvider");
  }

  return context;
}
