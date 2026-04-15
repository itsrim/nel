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
  type GroupMember,
} from '../data/mockData';

const LS_VIEWER_AVATAR = 'nel_viewer_profile_avatar_url';
const LS_VIEWER_NAME = 'nel_viewer_profile_display_name';
const DEFAULT_VIEWER_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800';
const DEFAULT_VIEWER_NAME = 'Jean J.';

function readViewerStorage(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v != null && v.trim() !== '' ? v.trim() : fallback;
  } catch {
    return fallback;
  }
}

export type NewEventInput = {
  conversationId: string;
  title: string;
  dateLabel: string;
  location: string;
  notes?: string;
  timeShort?: string;
  priceLabel?: string;
  imageUri?: string;
  participantMax?: number;
  dateKey: string;
  sectionDateLabel: string;
  hideAddress?: boolean;
  manualApproval?: boolean;
  isBeta?: boolean;
};

interface MessagingState {
  /** Synchronisé avec l’interrupteur « Mode admin » du profil (aperçu nel). */
  nelDemoIsAdmin: boolean;
  setNelDemoIsAdmin: (value: boolean) => void;
  /** Photo de profil (hero) — même source que l’onglet Profil, persistée. */
  viewerProfileAvatarUrl: string;
  setViewerProfileAvatarUrl: (url: string) => void;
  /** Prénom / pseudo affiché (hero, hôte, tuile « moi »). */
  viewerProfileDisplayName: string;
  setViewerProfileDisplayName: (name: string) => void;
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
  addEvent: (input: NewEventInput) => string;
  createEmptyGroup: (title: string) => string;
  postEventGroupWelcome: (conversationId: string, eventTitle: string) => void;
  addMemberToGroup: (conversationId: string, member: GroupMember) => void;
  removeMemberFromGroup: (conversationId: string, memberId: string) => void;
  leaveConversation: (conversationId: string) => void;
  updateConversationSettings: (conversationId: string, settings: { muteSounds?: boolean; blockNotifications?: boolean }) => void;
  joinEvent: (eventId: string) => void;
  leaveEvent: (eventId: string) => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  nelDemoIsAdmin: true,
  setNelDemoIsAdmin: (value) => set({ nelDemoIsAdmin: value }),

  viewerProfileAvatarUrl: readViewerStorage(LS_VIEWER_AVATAR, DEFAULT_VIEWER_AVATAR),
  setViewerProfileAvatarUrl: (url) => {
    try {
      localStorage.setItem(LS_VIEWER_AVATAR, url);
    } catch {
      /* ignore */
    }
    set({ viewerProfileAvatarUrl: url });
  },

  viewerProfileDisplayName: readViewerStorage(LS_VIEWER_NAME, DEFAULT_VIEWER_NAME),
  setViewerProfileDisplayName: (name) => {
    const n = name.trim() || DEFAULT_VIEWER_NAME;
    try {
      localStorage.setItem(LS_VIEWER_NAME, n);
    } catch {
      /* ignore */
    }
    set({ viewerProfileDisplayName: n });
  },

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

  createEmptyGroup: (title) => {
    const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const conv: Conversation = {
      id,
      title,
      type: 'group',
      lastMessagePreview: '',
      avatarGradient: ['#9B5DE5', '#C23B8E'] as const,
      unreadCount: 0,
      updatedAt: Date.now(),
      isFavorite: false,
      memberCount: 1,
      members: [
        { id: 'me', name: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
      ],
    };
    set((state) => ({
      conversations: [conv, ...state.conversations],
      messagesByConversation: {
        ...state.messagesByConversation,
        [id]: [],
      },
    }));
    return id;
  },

  addEvent: (input) => {
    const id = `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    const priceLabel = input.priceLabel?.trim() || 'Gratuit';
    const { viewerProfileDisplayName: vn, viewerProfileAvatarUrl: va } = get();
    const hostName = vn.trim() || 'Moi';
    const event: Event = {
      id,
      conversationId: input.conversationId,
      title: input.title,
      dateLabel: input.dateLabel,
      sectionDateLabel: input.sectionDateLabel,
      dateKey: input.dateKey,
      timeShort: input.timeShort?.trim() || '10:00',
      location: input.location,
      notes: input.notes,
      imageUri:
        input.imageUri?.trim() ||
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
      priceLabel,
      price: priceLabel,
      participantCount: 1,
      participantMax: Math.max(2, input.participantMax ?? 50),
      isFavorite: false,
      isBeta: input.isBeta === true,
      status: 'organisateur',
      visitsCount: 0,
      category: 'Sortie',
      hostName,
      hostAvatar: va,
      hostedByViewer: true,
      hideAddress: input.hideAddress,
      manualApproval: input.manualApproval,
    };
    set((state) => ({ events: [event, ...state.events] }));
    return id;
  },

  postEventGroupWelcome: (conversationId, eventTitle) => {
    const text = `La sortie « ${eventTitle} » est créée — discutez ici avec les participants.`;
    const msg: Message = {
      id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      conversationId,
      authorName: 'Système',
      text,
      sentAt: Date.now(),
      isOwn: false,
    };
    set((state) => {
      const prevMsgs = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...prevMsgs, msg],
        },
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessagePreview: text.slice(0, 120), updatedAt: Date.now() }
            : c,
        ),
      };
    });
  },

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
