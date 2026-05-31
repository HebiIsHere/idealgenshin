import { create } from 'zustand';

interface MenuState {
  openCount: number;
  registerOpen: () => void;
  registerClose: () => void;
}

export const useMenuStore = create<MenuState>((set) => ({
  openCount: 0,
  registerOpen: () => set((s) => ({ openCount: s.openCount + 1 })),
  registerClose: () => set((s) => ({ openCount: Math.max(0, s.openCount - 1) })),
}));
