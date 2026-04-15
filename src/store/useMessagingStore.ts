import { create } from 'zustand';
import {
  MOCK_EVENTS,
  MOCK_CONVERSATIONS,
  MOCK_VISITS,
  MOCK_SUGGESTIONS,
  MOCK_FRIENDS,
  type Event,
  type Conversation,
  type ProfileVisit,
  type SuggestionProfile,
  type Friend,
} from '../data/mockData';

interface MessagingState {
  events: Event[];
  conversations: Conversation[];
  profileVisits: ProfileVisit[];
  suggestions: SuggestionProfile[];
  friends: Friend[];
  favoriteConversationIds: string[];
  toggleEventFavorite: (eventId: string) => void;
  getEventById: (id: string) => Event | undefined;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  events: MOCK_EVENTS,
  conversations: MOCK_CONVERSATIONS,
  profileVisits: MOCK_VISITS,
  suggestions: MOCK_SUGGESTIONS,
  friends: MOCK_FRIENDS,
  favoriteConversationIds: MOCK_CONVERSATIONS.filter((c) => c.isFavorite).map((c) => c.id),

  toggleEventFavorite: (eventId) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, isFavorite: !e.isFavorite } : e,
      ),
    })),

  getEventById: (id) => get().events.find((e) => e.id === id),
}));
