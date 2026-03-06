import { create } from "zustand";

type OpenAccountState = {
    id?: string;
    isOpen: boolean;
    onOpen: (id?: string) => void;
    onClose: () => void;
}

export const useOpenAccount = create<OpenAccountState>((set) => ({
    id: undefined,
    isOpen: false,
    onOpen: (id) => set({ id, isOpen: true }),
    onClose: () => set({ id: undefined, isOpen: false }),
}));
