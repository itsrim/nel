import { create } from 'zustand';
import {
  MOCK_EVENTS,
  MOCK_CONVERSATIONS,
  MOCK_VISITS,
  MOCK_SUGGESTIONS,
  MOCK_FRIENDS,
  MOCK_MESSAGES,
  type Event,
  type Conversation,
  type ProfileVisit,
  type SuggestionProfile,
  type Friend,
  type Message,
} from '../data/mockData';

interface MessagingState {
  events: Event[];
  conversations: Conversation[];
  profileVisits: ProfileVisit[];
  suggestions: SuggestionProfile[];
  friends: Friend[];
  favoriteConversationIds: string[];
  messagesByConversation: Record<string, Message[]>;
  toggleEventFavorite: (eventId: string) => void;
  toggleConversationFavorite: (conversationId: string) => void;
  getEventById: (id: string) => Event | undefined;
  getEventByConversationId: (conversationId: string) => Event | undefined;
  sendMessage: (conversationId: string, text: string) => void;
  markAsRead: (conversationId: string) => void;
  addMemberToGroup: (conversationId: string, member: GroupMember) => void;
  removeMemberFromGroup: (conversationId: string, memberId: string) => void;
  leaveConversation: (conversationId: string) => void;
  updateConversationSettings: (conversationId: string, settings: { muteSounds?: boolean; blockNotifications?: boolean }) => void;
  joinEvent: (eventId: string) => void;
  leaveEvent: (eventId: string) => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  events: MOCK_EVENTS,
  conversations: MOCK_CONVERSATIONS,
  profileVisits: MOCK_VISITS,
  suggestions: MOCK_SUGGESTIONS,
  friends: MOCK_FRIENDS,
  favoriteConversationIds: MOCK_CONVERSATIONS.filter((c) => c.isFavorite).map((c) => c.id),
  messagesByConversation: MOCK_MESSAGES,

  toggleEventFavorite: (eventId) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, isFavorite: !e.isFavorite } : e,
      ),
    })),

  toggleConversationFavorite: (conversationId) =>
    set((state) => {
      const isFavorite = state.favoriteConversationIds.includes(conversationId);
      const newFavs = isFavorite
        ? state.favoriteConversationIds.filter((id) => id !== conversationId)
        : [...state.favoriteConversationIds, conversationId];
      
      return {
        favoriteConversationIds: newFavs,
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, isFavorite: !isFavorite } : c
        ),
      };
    }),

  getEventById: (id) => get().events.find((e) => e.id === id),

  getEventByConversationId: (conversationId) => 
    get().events.find((e) => e.conversationId === conversationId),

  sendMessage: (conversationId, text) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      conversationId,
      authorName: 'Moi',
      text,
      sentAt: Date.now(),
      isOwn: true,
    };

    set((state) => {
      const currentMessages = state.messagesByConversation[conversationId] || [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...currentMessages, newMessage],
        },
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessagePreview: text, updatedAt: Date.now() }
            : c,
        ),
      };
    });
  },

  markAsRead: (conversationId) => {
    const conv = get().conversations.find(c => c.id === conversationId);
    if (!conv || conv.unreadCount === 0) return;

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    }));
  },

  addMemberToGroup: (conversationId, member) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              members: [...c.members.filter(m => m.id !== member.id), member],
              memberCount: (c.memberCount || 0) + (c.members.some(m => m.id === member.id) ? 0 : 1)
            }
          : c
      ),
    }));
  },

  removeMemberFromGroup: (conversationId, memberId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              members: c.members.filter((m) => m.id !== memberId),
              memberCount: Math.max(0, (c.memberCount || 1) - 1)
            }
          : c
      ),
    }));
  },

  leaveConversation: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
    }));
  },

  updateConversationSettings: (conversationId, settings) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, ...settings } : c
      ),
    }));
  },

  joinEvent: (eventId) => {
    const event = get().events.find(e => e.id === eventId);
    if (event) {
      // Ensure conversation is added back if missing
      const convExists = get().conversations.some(c => c.id === event.conversationId);
      if (!convExists) {
        const originalConv = MOCK_CONVERSATIONS.find(c => c.id === event.conversationId);
        if (originalConv) {
          set(state => ({
            conversations: [originalConv, ...state.conversations]
          }));
        }
      }
    }

    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId
          ? {
              ...e,
              status: 'inscrit',
              participantCount: Math.min(e.participantMax, e.participantCount + 1),
            }
          : e
      ),
    }));
  },

  leaveEvent: (eventId) => {
    const event = get().events.find(e => e.id === eventId);
    if (event) {
      // Remove associated conversation
      get().leaveConversation(event.conversationId);
    }

    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId
          ? {
              ...e,
              status: 'inscrire',
              participantCount: Math.max(0, e.participantCount - 1),
            }
          : e
      ),
    }));
  },
}));
