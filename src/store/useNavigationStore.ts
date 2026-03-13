import { create } from 'zustand';

export type TabId = 'home' | 'chat' | 'tickets' | 'profile' | 'more';

interface NavigationStore {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
