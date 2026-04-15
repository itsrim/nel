import { create } from 'zustand';

export type TabId = 'chat' | 'events' | 'profile';

interface NavigationStore {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  activeTab: 'chat',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
