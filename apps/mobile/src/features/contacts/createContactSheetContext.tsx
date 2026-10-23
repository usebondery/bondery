import { createContext, type ReactNode, useContext, useState } from "react";
import { CreateContactSheet } from "./components/CreateContactSheet";

interface CreateContactSheetContextValue {
  openCreateContact: () => void;
}

const CreateContactSheetContext = createContext<CreateContactSheetContextValue | null>(null);

export function CreateContactSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  function openCreateContact() {
    setOpen(true);
  }

  const value = { openCreateContact };

  return (
    <CreateContactSheetContext.Provider value={value}>
      {children}
      <CreateContactSheet onOpenChange={setOpen} open={open} />
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
