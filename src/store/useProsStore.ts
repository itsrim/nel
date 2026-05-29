import { create } from "zustand";
import {
  MOCK_PROFESSIONALS,
  type MockProfessional,
} from "../data/mockProfessionals";

interface ProsState {
  professionals: MockProfessional[];
  hydrateProfessionals: (remote: MockProfessional[]) => void;
  getById: (id: string) => MockProfessional | undefined;
}

export const useProsStore = create<ProsState>((set, get) => ({
  professionals: [...MOCK_PROFESSIONALS],

  hydrateProfessionals: (remote) => {
    if (remote.length === 0) return;
    set((state) => {
      const map = new Map(state.professionals.map((p) => [p.id, p]));
      remote.forEach((p) => {
        const prev = map.get(p.id);
        map.set(p.id, prev ? { ...prev, ...p } : p);
      });
      return { professionals: [...map.values()] };
    });
  },

  getById: (id) => get().professionals.find((p) => p.id === id),
}));

export function getProfessionalById(id: string): MockProfessional | undefined {
  return useProsStore.getState().getById(id);
}
