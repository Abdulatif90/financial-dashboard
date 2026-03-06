import { create } from "zustand";

type OpenCategoryState = {
    id?: string;
    isOpen: boolean;
    onOpen: (id?: string) => void;
    onClose: () => void;
}

export const useOpenCategory = create<OpenCategoryState>((set) => ({
    id: undefined,
    isOpen: false,
    onOpen: (id) => set({ id, isOpen: true }),
    onClose: () => set({ id: undefined, isOpen: false }),
}));
