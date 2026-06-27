import type { Contact } from "@bondery/schemas";
import { create } from "zustand";

interface ContactsStoreState {
  byId: Record<string, Contact>;
  myselfContactId: string | null;
  isListStale: boolean;
  upsertContact: (contact: Contact) => void;
  upsertContacts: (contacts: Contact[]) => void;
  removeContact: (id: string) => void;
  setListStale: () => void;
  clearListStale: () => void;
  clearAll: () => void;
}

function didNameChange(previous: Contact | undefined, next: Contact) {
  if (!previous) {
    return false;
  }

  return (
    previous.firstName !== next.firstName || previous.lastName !== next.lastName
  );
}

export const useContactsStore = create<ContactsStoreState>()((set) => ({
  byId: {},
  myselfContactId: null,
  isListStale: false,
  upsertContact: (contact) =>
    set((state) => {
      const existing = state.byId[contact.id];
      const nextMyselfContactId = contact.myself
        ? contact.id
        : state.myselfContactId;

      return {
        byId: {
          ...state.byId,
          [contact.id]: contact,
        },
        myselfContactId: nextMyselfContactId,
        isListStale: state.isListStale || didNameChange(existing, contact),
      };
    }),
  upsertContacts: (contacts) =>
    set((state) => {
      if (contacts.length === 0) {
        return state;
      }

      const nextById = { ...state.byId };
      let nextMyselfContactId = state.myselfContactId;

      for (const contact of contacts) {
        nextById[contact.id] = contact;
        if (contact.myself) {
          nextMyselfContactId = contact.id;
        }
      }

      return {
        byId: nextById,
        myselfContactId: nextMyselfContactId,
      };
    }),
  removeContact: (id) =>
    set((state) => ({
      byId: Object.fromEntries(
        Object.entries(state.byId).filter(([contactId]) => contactId !== id),
      ),
      myselfContactId:
        state.myselfContactId === id ? null : state.myselfContactId,
    })),
  setListStale: () => set({ isListStale: true }),
  clearListStale: () => set({ isListStale: false }),
  clearAll: () =>
    set({
      byId: {},
      myselfContactId: null,
      isListStale: false,
    }),
}));
