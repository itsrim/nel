import { create } from "zustand";
import type { MockProfessional } from "../data/mockProfessionals";
import { buildViewerProfessional, VIEWER_PRO_ID } from "../lib/proLocation";
import { useMessagingStore } from "./useMessagingStore";

interface ProsState {
  professionals: MockProfessional[];
  hydrateProfessionals: (remote: MockProfessional[]) => void;
  getById: (id: string) => MockProfessional | undefined;
}

export const useProsStore = create<ProsState>((set, get) => ({
  professionals: [],

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

  getById: (id) => {
    const found = get().professionals.find((p) => p.id === id);
    if (found) return found;
    if (id !== VIEWER_PRO_ID) return undefined;
    const s = useMessagingStore.getState();
    return (
      buildViewerProfessional({
        displayName: s.viewerProfileDisplayName,
        avatarUrl: s.viewerProfileAvatarUrl,
        city: s.viewerProfileCity,
        address: s.viewerProAddress,
        lat: s.viewerProLat,
        lng: s.viewerProLng,
        websiteUrl: s.viewerProWebsiteUrl,
        socialUrl: s.viewerProSocialUrl,
        phone: s.viewerProPhone,
      }) ?? undefined
    );
  },
}));

export function getProfessionalById(id: string): MockProfessional | undefined {
  return useProsStore.getState().getById(id);
}
