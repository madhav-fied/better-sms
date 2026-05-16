import { create } from 'zustand';

interface ParentChildState {
  selectedChildId: string | null;
  setSelectedChild: (id: string) => void;
}

export const useParentChildStore = create<ParentChildState>((set) => ({
  selectedChildId: null,
  setSelectedChild: (id) => set({ selectedChildId: id }),
}));
