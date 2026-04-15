import { create } from 'zustand';

export type TabId = 'home' | 'events' | 'chat' | 'profile';
export type DetailType = 'chat' | 'event' | 'event_create' | 'profile' | 'chat_settings';

export interface DetailState {
  type: DetailType;
  id: string;
}

interface NavigationStore {
  activeTab: TabId;
  detailStack: DetailState[];
  setActiveTab: (tab: TabId) => void;
  openDetail: (type: DetailType, id: string) => void;
  closeDetail: () => void;
  /** Retire plusieurs overlays d’un coup (ex. fermer édition + fiche événement). */
  popDetails: (count: number) => void;
  clearStack: () => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  activeTab: 'chat',
  detailStack: [],
  setActiveTab: (tab) => set({ activeTab: tab, detailStack: [] }),
  openDetail: (type, id) => set((state) => ({ 
    detailStack: [...state.detailStack, { type, id }] 
  })),
  closeDetail: () => set((state) => ({ 
    detailStack: state.detailStack.slice(0, -1) 
  })),
  popDetails: (count) =>
    set((state) => {
      const n = Math.max(0, Math.floor(count));
      if (n === 0) return state;
      return { detailStack: state.detailStack.slice(0, Math.max(0, state.detailStack.length - n)) };
    }),
  clearStack: () => set({ detailStack: [] }),
}));
