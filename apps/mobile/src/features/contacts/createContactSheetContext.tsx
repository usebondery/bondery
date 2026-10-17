import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { CreateContactSheet } from "./components/CreateContactSheet";

interface CreateContactSheetContextValue {
  openCreateContact: () => void;
}

const CreateContactSheetContext = createContext<CreateContactSheetContextValue | null>(null);

export function CreateContactSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openCreateContact = useCallback(() => {
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openCreateContact }), [openCreateContact]);

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
