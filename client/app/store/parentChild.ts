import { create } from 'zustand';

export interface ChildInfo {
  id: string;
  first_name: string;
  last_name?: string;
  class_section_id?: string;
  class_name?: string;
  section?: string;
}

interface ParentChildState {
  selectedChildId: string | null;
  selectedChild: ChildInfo | null;
  children: ChildInfo[];
  setSelectedChild: (id: string) => void;
  setChildren: (children: ChildInfo[]) => void;
}

export const useParentChildStore = create<ParentChildState>((set, get) => ({
  selectedChildId: null,
  selectedChild: null,
  children: [],
  setSelectedChild: (id) => {
    const child = get().children.find((c) => c.id === id) ?? null;
    set({ selectedChildId: id, selectedChild: child });
  },
  setChildren: (children) => {
    const current = get().selectedChildId;
    const first = children[0] ?? null;
    const selected = children.find((c) => c.id === current) ?? first;
    set({ children, selectedChild: selected, selectedChildId: selected?.id ?? null });
  },
}));
