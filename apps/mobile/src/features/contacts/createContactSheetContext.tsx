import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Contact } from "@bondery/schemas";
import { CreateContactSheet } from "./components/CreateContactSheet";

interface CreateContactSheetContextValue {
  openCreateContact: () => void;
  contactsListVersion: number;
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
      openCreateContact,
      contactsListVersion,
    }),
    [contactsListVersion, openCreateContact],
  );

  return (
    <CreateContactSheetContext.Provider value={value}>
      {children}
      <CreateContactSheet open={open} onOpenChange={setOpen} onCreated={handleCreated} />
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
