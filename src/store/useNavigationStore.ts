import { create } from 'zustand';

export type TabId = 'home' | 'wallet' | 'exchange' | 'markets' | 'profile';

interface NavigationStore {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  activeTab: 'exchange',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
