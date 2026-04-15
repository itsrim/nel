/* ── Mock Data ─────────────────────────────────────────────────── */

// ── Types ──

export interface Event {
  id: string;
  title: string;
  location: string;
  dateKey: string;          // "YYYY-MM-DD"
  timeShort: string;        // "HH:MM"
  dateLabel: string;        // e.g. "Lundi 23 mars"
  sectionDateLabel: string; // aligné sur `formatEventSectionTitle` (fr-FR, ex. "Lundi 23 mars 2026")
  imageUri: string;
  priceLabel: string;
  participantCount: number;
  participantMax: number;
  isFavorite: boolean;
  isBeta: boolean;
  status: 'inscrit' | 'inscrire' | 'organisateur' | 'en_attente';
  notes?: string;
  conversationId: string;
  visitsCount?: number;
  category: string;
  hostName: string;
  hostAvatar: string;
  price: string;
  /** Options création (meetabit). */
  hideAddress?: boolean;
  manualApproval?: boolean;
  /** Sortie créée depuis nel : hôte = profil visiteur (photo / prénom suivis en direct). */
  hostedByViewer?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  type: 'dm' | 'group';
  lastMessagePreview: string;
  avatarGradient: readonly [string, string];
  unreadCount: number;
  updatedAt: number;
  isFavorite: boolean;
  members: GroupMember[];
  memberCount?: number; 
  muteSounds?: boolean;
  blockNotifications?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  authorName: string;
  text: string;
  sentAt: number;
  isOwn: boolean;
}

export interface GroupMember {
  id: string;
  name: string;
  avatarGradient: readonly [string, string];
  isSelf: boolean;
  profilId?: string;
}

export interface ProfileVisit {
  id: string;
  name: string;
  age: number;
  avatarUrl: string;
  lastVisitAt: number;
  visitMultiplier?: number;
  friendRequest: boolean;
}

export interface SuggestionProfile {
  id: string;
  pseudo: string;
  age: number;
  imageUrl: string;
  aspectRatio: number;
}

export interface Friend {
  profilId: string;
  /** Nom affiché (cartes, listes). */
  name: string;
  age: number | null;
  city: string;
  imageUrl: string;
  /** Sorties en commun avec le profil connecté (toi). */
  eventsInCommon: number;
  /** Fil privé nel avec toi — ouvre le bon chat depuis « Message ». */
  mainChatConversationId: string;
  pseudo?: string;
  bio?: string;
  memberSince?: string;
  verified?: boolean;
  stats?: { reliability: number; events: number; friends: number };
  badges?: string[];
}

// ── Event image pool (picsum) ──
const img = (seed: number) => `https://picsum.photos/seed/${seed}/600/400`;

/** Portraits carrés stables (Unsplash) — rendu proche de « vrais » profils. */
function friendHeadshot(id: 'f1' | 'f2' | 'f3' | 'f4' | 'f5'): string {
  const urls: Record<typeof id, string> = {
    f1: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=384&h=384&q=80',
    f2: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=384&h=384&q=80',
    f3: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=384&h=384&q=80',
    f4: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=384&h=384&q=80',
    f5: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=384&h=384&q=80',
  };
  return urls[id];
}

// ── Events ──
export const MOCK_EVENTS: Event[] = [
  { id: 'e1', title: 'Atelier Cuisine Italienne', location: 'Montmartre, Paris', dateKey: '2026-03-23', timeShort: '08:00', dateLabel: 'Lundi 23 mars', sectionDateLabel: 'Lundi 23 mars 2026', imageUri: img(101), priceLabel: '57€', participantCount: 22, participantMax: 30, isFavorite: true, isBeta: false, status: 'inscrit', conversationId: 'c1', visitsCount: 120, category: 'Cuisine', hostName: 'Chef Giovanni', hostAvatar: 'https://i.pravatar.cc/100?u=g1', price: '57€' },
  { id: 'e2', title: 'Visite Musée d\'Orsay', location: 'Café de Flore', dateKey: '2026-03-23', timeShort: '14:00', dateLabel: 'Lundi 23 mars', sectionDateLabel: 'Lundi 23 mars 2026', imageUri: img(102), priceLabel: '17€', participantCount: 31, participantMax: 150, isFavorite: false, isBeta: false, status: 'inscrit', conversationId: 'c2', visitsCount: 95, category: 'Culture', hostName: 'Claire D.', hostAvatar: 'https://i.pravatar.cc/100?u=c1', price: '17€' },
  { id: 'e3', title: 'Cours de Guitare', location: 'Saint-Germain', dateKey: '2026-03-23', timeShort: '18:00', dateLabel: 'Lundi 23 mars', sectionDateLabel: 'Lundi 23 mars 2026', imageUri: img(103), priceLabel: 'Gratuit', participantCount: 15, participantMax: 200, isFavorite: false, isBeta: false, status: 'inscrire', conversationId: 'c3', visitsCount: 80, category: 'Musique', hostName: 'Marc L.', hostAvatar: 'https://i.pravatar.cc/100?u=m1', price: 'Gratuit' },
  { id: 'e4', title: 'Escape Game', location: 'Station F', dateKey: '2026-03-24', timeShort: '08:00', dateLabel: 'Mardi 24 mars', sectionDateLabel: 'Mardi 24 mars 2026', imageUri: img(104), priceLabel: '56€', participantCount: 21, participantMax: 20, isFavorite: true, isBeta: false, status: 'inscrit', conversationId: 'c4', visitsCount: 200, category: 'Jeux', hostName: 'Alice F.', hostAvatar: 'https://i.pravatar.cc/100?u=a1', price: '56€' },
  { id: 'e5', title: 'Atelier Cocktails', location: 'Le Marais', dateKey: '2026-03-24', timeShort: '19:30', dateLabel: 'Mardi 24 mars', sectionDateLabel: 'Mardi 24 mars 2026', imageUri: img(105), priceLabel: '21€', participantCount: 7, participantMax: 15, isFavorite: false, isBeta: false, status: 'inscrit', conversationId: 'c5', visitsCount: 60, category: 'Mixologie', hostName: 'Bartender Sam', hostAvatar: 'https://i.pravatar.cc/100?u=b1', price: '21€' },
  { id: 'e6', title: 'Cours de Yoga', location: 'Bastille', dateKey: '2026-03-25', timeShort: '11:00', dateLabel: 'Mercredi 25 mars', sectionDateLabel: 'Mercredi 25 mars 2026', imageUri: img(106), priceLabel: 'Gratuit', participantCount: 6, participantMax: 6, isFavorite: false, isBeta: false, status: 'organisateur', conversationId: 'c6', visitsCount: 150, category: 'Bien-être', hostName: 'Elena Y.', hostAvatar: 'https://i.pravatar.cc/100?u=e1', price: 'Gratuit' },
  { id: 'e7', title: 'Concert Jazz', location: 'Opéra Garnier', dateKey: '2026-03-25', timeShort: '20:00', dateLabel: 'Mercredi 25 mars', sectionDateLabel: 'Mercredi 25 mars 2026', imageUri: img(107), priceLabel: '45€', participantCount: 50, participantMax: 100, isFavorite: true, isBeta: false, status: 'inscrit', conversationId: 'c7', visitsCount: 180, category: 'Musique', hostName: 'Jazz Band', hostAvatar: 'https://i.pravatar.cc/100?u=j1', price: '45€' },
  { id: 'e8', title: 'Exposition Art Moderne', location: 'Centre Pompidou', dateKey: '2026-03-26', timeShort: '10:00', dateLabel: 'Jeudi 26 mars', sectionDateLabel: 'Jeudi 26 mars 2026', imageUri: img(108), priceLabel: '25€', participantCount: 80, participantMax: 150, isFavorite: false, isBeta: false, status: 'inscrire', conversationId: 'c8', category: 'Culture', hostName: 'Musée P.', hostAvatar: 'https://i.pravatar.cc/100?u=p1', price: '25€' },
  { id: 'e9', title: 'Workshop Photo', location: 'Montparnasse', dateKey: '2026-03-27', timeShort: '10:00', dateLabel: 'Vendredi 27 mars', sectionDateLabel: 'Vendredi 27 mars 2026', imageUri: img(109), priceLabel: '35€', participantCount: 15, participantMax: 20, isFavorite: false, isBeta: false, status: 'inscrit', conversationId: 'c9' },
  { id: 'e10', title: 'Festival de Musique', location: 'Parc de la Villette', dateKey: '2026-03-28', timeShort: '16:00', dateLabel: 'Samedi 28 mars', sectionDateLabel: 'Samedi 28 mars 2026', imageUri: img(110), priceLabel: '30€', participantCount: 120, participantMax: 200, isFavorite: false, isBeta: false, status: 'inscrire', conversationId: 'c10' },
  { id: 'e11', title: 'Cours de Danse Salsa', location: 'Marais', dateKey: '2026-03-29', timeShort: '18:00', dateLabel: 'Dimanche 29 mars', sectionDateLabel: 'Dimanche 29 mars 2026', imageUri: img(111), priceLabel: '40€', participantCount: 12, participantMax: 15, isFavorite: true, isBeta: false, status: 'inscrit', conversationId: 'c11' },
  { id: 'e12', title: 'Conférence Tech', location: 'Station F', dateKey: '2026-03-29', timeShort: '14:00', dateLabel: 'Dimanche 29 mars', sectionDateLabel: 'Dimanche 29 mars 2026', imageUri: img(112), priceLabel: 'Gratuit', participantCount: 200, participantMax: 300, isFavorite: false, isBeta: true, status: 'inscrire', conversationId: 'c12' },
];

// ── Conversations ──
export const MOCK_CONVERSATIONS: Conversation[] = [
  { 
    id: 'c1', title: 'Atelier Cuisine Italienne', type: 'group', lastMessagePreview: 'Salut ! On se retrouve où ?', avatarGradient: ['#FF6B35', '#FF4081'], unreadCount: 5, updatedAt: Date.now() - 120_000, isFavorite: true,
    memberCount: 3,
    members: [
      { id: 'me', name: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
      { id: 'm1', name: 'Marie', isSelf: false, avatarGradient: ['#EC407A', '#F48FB1'], profilId: 'f1' },
      { id: 'm2', name: 'Lucas', isSelf: false, avatarGradient: ['#42A5F5', '#1E88E5'], profilId: 'f2' },
    ]
  },
  { 
    id: 'c2', title: 'Visite Musée d\'Orsay', type: 'group', lastMessagePreview: 'Parfait, à demain !', avatarGradient: ['#AB47BC', '#7C4DFF'], unreadCount: 3, updatedAt: Date.now() - 600_000, isFavorite: true,
    memberCount: 4,
    members: [
      { id: 'me', name: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
      { id: 'm3', name: 'Emma', isSelf: false, avatarGradient: ['#66BB6A', '#43A047'], profilId: 'f3' },
      { id: 'm4', name: 'Hugo', isSelf: false, avatarGradient: ['#FFC107', '#FF9800'], profilId: 'f4' },
      { id: 'm5', name: 'Sarah', isSelf: false, avatarGradient: ['#EF5350', '#E53935'], profilId: 'f5' },
    ]
  },
  { id: 'c3', title: 'Cours de Guitare', type: 'group', lastMessagePreview: 'Le projet avance bien', avatarGradient: ['#26C6DA', '#00BFA5'], unreadCount: 2, updatedAt: Date.now() - 3_600_000, isFavorite: false, members: [] },
  { id: 'c4', title: 'Escape Game', type: 'group', lastMessagePreview: 'On se retrouve à 20h', avatarGradient: ['#FFC107', '#FF9800'], unreadCount: 2, updatedAt: Date.now() - 7_200_000, isFavorite: true, members: [] },
  { id: 'c5', title: 'Atelier Cocktails', type: 'group', lastMessagePreview: "À tout à l'heure !", avatarGradient: ['#EC407A', '#F48FB1'], unreadCount: 1, updatedAt: Date.now() - 14_400_000, isFavorite: false, members: [] },
  { id: 'c6', title: 'Cours de Yoga', type: 'group', lastMessagePreview: 'Namasté 🧘', avatarGradient: ['#66BB6A', '#43A047'], unreadCount: 0, updatedAt: Date.now() - 86_400_000, isFavorite: false, members: [] },
  { id: 'c7', title: 'Concert Jazz', type: 'group', lastMessagePreview: 'Cool, on fait ça !', avatarGradient: ['#42A5F5', '#1E88E5'], unreadCount: 0, updatedAt: Date.now() - 100_000_000, isFavorite: true, members: [] },
  { id: 'c8', title: 'Exposition Art Moderne', type: 'group', lastMessagePreview: 'Merci pour l\'info !', avatarGradient: ['#EF5350', '#E53935'], unreadCount: 0, updatedAt: Date.now() - 200_000_000, isFavorite: false, members: [] },
  // DM 1:1 avec toi (membre non-moi en premier → avatar tête dans ChatRoomPage)
  {
    id: 'dm-f1',
    title: 'Marie L.',
    type: 'dm',
    lastMessagePreview: 'Parfait, merci pour l’info métro !',
    avatarGradient: ['#EC407A', '#F48FB1'],
    unreadCount: 1,
    updatedAt: Date.now() - 45_000,
    isFavorite: true,
    memberCount: 2,
    members: [
      { id: 'u-f1', name: 'Marie L.', isSelf: false, avatarGradient: ['#EC407A', '#F48FB1'], profilId: 'f1' },
      { id: 'me', name: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
    ],
  },
  {
    id: 'dm-f2',
    title: 'Lucas M.',
    type: 'dm',
    lastMessagePreview: 'Je t’envoie le lien Maps tout à l’heure',
    avatarGradient: ['#42A5F5', '#1E88E5'],
    unreadCount: 0,
    updatedAt: Date.now() - 180_000,
    isFavorite: false,
    memberCount: 2,
    members: [
      { id: 'u-f2', name: 'Lucas M.', isSelf: false, avatarGradient: ['#42A5F5', '#1E88E5'], profilId: 'f2' },
      { id: 'me', name: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
    ],
  },
  {
    id: 'dm-f3',
    title: 'Emma R.',
    type: 'dm',
    lastMessagePreview: 'Hâte de refaire une sortie avec toi',
    avatarGradient: ['#66BB6A', '#43A047'],
    unreadCount: 0,
    updatedAt: Date.now() - 900_000,
    isFavorite: true,
    memberCount: 2,
    members: [
      { id: 'u-f3', name: 'Emma R.', isSelf: false, avatarGradient: ['#66BB6A', '#43A047'], profilId: 'f3' },
      { id: 'me', name: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
    ],
  },
  {
    id: 'dm-f4',
    title: 'Hugo D.',
    type: 'dm',
    lastMessagePreview: 'Ok pour le créneau 19h',
    avatarGradient: ['#FFC107', '#FF9800'],
    unreadCount: 0,
    updatedAt: Date.now() - 3_600_000,
    isFavorite: false,
    memberCount: 2,
    members: [
      { id: 'u-f4', name: 'Hugo D.', isSelf: false, avatarGradient: ['#FFC107', '#FF9800'], profilId: 'f4' },
      { id: 'me', name: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
    ],
  },
  {
    id: 'dm-f5',
    title: 'Sarah K.',
    type: 'dm',
    lastMessagePreview: 'À bientôt sur Nel !',
    avatarGradient: ['#EF5350', '#E53935'],
    unreadCount: 0,
    updatedAt: Date.now() - 86_400_000,
    isFavorite: false,
    memberCount: 2,
    members: [
      { id: 'u-f5', name: 'Sarah K.', isSelf: false, avatarGradient: ['#EF5350', '#E53935'], profilId: 'f5' },
      { id: 'me', name: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
    ],
  },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  'c1': [
    { id: 'm1', conversationId: 'c1', authorName: 'Marie', text: 'Salut ! On se retrouve où pour l’atelier cuisine ?', sentAt: Date.now() - 120_000, isOwn: false },
    { id: 'm2', conversationId: 'c1', authorName: 'Moi', text: "Au pied du métro comme d'hab ?", sentAt: Date.now() - 60_000, isOwn: true },
  ],
  'c2': [
    { id: 'm3', conversationId: 'c2', authorName: 'Sophie', text: 'Parfait, à demain !', sentAt: Date.now() - 600_000, isOwn: false },
  ],
  'c7': [
    { id: 'm4', conversationId: 'c7', authorName: 'Lucas', text: 'Cool, on fait ça !', sentAt: Date.now() - 100_000_000, isOwn: false },
  ],
  'dm-f1': [
    {
      id: 'df1-1',
      conversationId: 'dm-f1',
      authorName: 'Marie L.',
      text: 'Tu confirmes pour l’atelier cuisine dimanche ? J’ai réservé pour nous deux.',
      sentAt: Date.now() - 720_000,
      isOwn: false,
    },
    {
      id: 'df1-2',
      conversationId: 'dm-f1',
      authorName: 'Moi',
      text: 'Oui carrément, merci d’avoir géré la résa !',
      sentAt: Date.now() - 700_000,
      isOwn: true,
    },
    {
      id: 'df1-3',
      conversationId: 'dm-f1',
      authorName: 'Marie L.',
      text: 'Parfait, merci pour l’info métro !',
      sentAt: Date.now() - 45_000,
      isOwn: false,
    },
  ],
  'dm-f2': [
    {
      id: 'df2-1',
      conversationId: 'dm-f2',
      authorName: 'Lucas M.',
      text: 'Salut ! On se fait la rando dont tu parlais la semaine pro ?',
      sentAt: Date.now() - 400_000,
      isOwn: false,
    },
    {
      id: 'df2-2',
      conversationId: 'dm-f2',
      authorName: 'Moi',
      text: 'Yes, je suis partant. Tu proposes un lieu ?',
      sentAt: Date.now() - 380_000,
      isOwn: true,
    },
    {
      id: 'df2-3',
      conversationId: 'dm-f2',
      authorName: 'Lucas M.',
      text: 'Je t’envoie le lien Maps tout à l’heure',
      sentAt: Date.now() - 180_000,
      isOwn: false,
    },
  ],
  'dm-f3': [
    {
      id: 'df3-1',
      conversationId: 'dm-f3',
      authorName: 'Moi',
      text: 'Merci encore pour le musée Orsay, c’était top avec toi et le groupe',
      sentAt: Date.now() - 1_200_000,
      isOwn: true,
    },
    {
      id: 'df3-2',
      conversationId: 'dm-f3',
      authorName: 'Emma R.',
      text: 'Hâte de refaire une sortie avec toi',
      sentAt: Date.now() - 900_000,
      isOwn: false,
    },
  ],
  'dm-f4': [
    {
      id: 'df4-1',
      conversationId: 'dm-f4',
      authorName: 'Hugo D.',
      text: 'Tu es dispo jeudi pour l’afterwork ?',
      sentAt: Date.now() - 5_000_000,
      isOwn: false,
    },
    {
      id: 'df4-2',
      conversationId: 'dm-f4',
      authorName: 'Moi',
      text: 'Jeudi 19h ça me va',
      sentAt: Date.now() - 4_800_000,
      isOwn: true,
    },
    {
      id: 'df4-3',
      conversationId: 'dm-f4',
      authorName: 'Hugo D.',
      text: 'Ok pour le créneau 19h',
      sentAt: Date.now() - 3_600_000,
      isOwn: false,
    },
  ],
  'dm-f5': [
    {
      id: 'df5-1',
      conversationId: 'dm-f5',
      authorName: 'Sarah K.',
      text: 'Super de t’avoir croisé sur la sortie Bordeaux, on garde contact',
      sentAt: Date.now() - 100_000_000,
      isOwn: false,
    },
    {
      id: 'df5-2',
      conversationId: 'dm-f5',
      authorName: 'Moi',
      text: 'Avec plaisir !',
      sentAt: Date.now() - 99_000_000,
      isOwn: true,
    },
    {
      id: 'df5-3',
      conversationId: 'dm-f5',
      authorName: 'Sarah K.',
      text: 'À bientôt sur Nel !',
      sentAt: Date.now() - 86_400_000,
      isOwn: false,
    },
  ],
};

// ── Profile Visits ──
export const MOCK_VISITS: ProfileVisit[] = [
  { id: 'v1', name: 'Maya', age: 18, avatarUrl: 'https://i.pravatar.cc/150?img=1', lastVisitAt: Date.now() - 480_000, friendRequest: true },
  { id: 'v2', name: 'Lily', age: 23, avatarUrl: 'https://i.pravatar.cc/150?img=5', lastVisitAt: Date.now() - 1_260_000, visitMultiplier: 2, friendRequest: false },
  { id: 'v3', name: 'Chloé', age: 30, avatarUrl: 'https://i.pravatar.cc/150?img=9', lastVisitAt: Date.now() - 3_600_000, friendRequest: false },
  { id: 'v4', name: 'Lola', age: 21, avatarUrl: 'https://i.pravatar.cc/150?img=16', lastVisitAt: Date.now() - 10_800_000, visitMultiplier: 3, friendRequest: false },
  { id: 'v5', name: 'Emma', age: 25, avatarUrl: 'https://i.pravatar.cc/150?img=20', lastVisitAt: Date.now() - 172_800_000, friendRequest: false },
];

// ── Suggestion Profiles ──
export const MOCK_SUGGESTIONS: SuggestionProfile[] = [
  { id: 's1', pseudo: 'Jasmine', age: 32, imageUrl: 'https://i.pravatar.cc/400?img=32', aspectRatio: 0.75 },
  { id: 's2', pseudo: 'Nicole', age: 20, imageUrl: 'https://i.pravatar.cc/400?img=44', aspectRatio: 1.2 },
  { id: 's3', pseudo: 'Jiselle', age: 26, imageUrl: 'https://i.pravatar.cc/400?img=47', aspectRatio: 0.8 },
  { id: 's4', pseudo: 'Priya', age: 28, imageUrl: 'https://i.pravatar.cc/400?img=45', aspectRatio: 1.0 },
  { id: 's5', pseudo: 'Camille', age: 24, imageUrl: 'https://i.pravatar.cc/400?img=43', aspectRatio: 0.65 },
  { id: 's6', pseudo: 'Léa', age: 22, imageUrl: 'https://i.pravatar.cc/400?img=48', aspectRatio: 1.1 },
];

// ── Amis (profils complets + DM dédié avec toi, alignés sur les groupes c1 / c2) ──
export const MOCK_FRIENDS: Friend[] = [
  {
    profilId: 'f1',
    name: 'Marie L.',
    pseudo: 'Marie',
    age: 28,
    city: 'Paris · 11e',
    imageUrl: friendHeadshot('f1'),
    eventsInCommon: 12,
    mainChatConversationId: 'dm-f1',
    bio: 'Foodie et italienne dans l’âme. On s’est connus sur l’atelier cuisine — toujours partante pour un resto ou un marché avec toi.',
    memberSince: '2024',
    verified: true,
    stats: { reliability: 4.9, events: 24, friends: 38 },
    badges: ['Ponctuelle', 'Organisatrice', 'Foodie'],
  },
  {
    profilId: 'f2',
    name: 'Lucas M.',
    pseudo: 'Lucas',
    age: 31,
    city: 'Lyon · Presqu’île',
    imageUrl: friendHeadshot('f2'),
    eventsInCommon: 8,
    mainChatConversationId: 'dm-f2',
    bio: 'Trail et photo le week-end. Même groupe que toi sur plusieurs sorties Nel — on enchaîne les bons plans rando.',
    memberSince: '2023',
    verified: true,
    stats: { reliability: 4.7, events: 18, friends: 52 },
    badges: ['Explorateur', 'Photographe'],
  },
  {
    profilId: 'f3',
    name: 'Emma R.',
    pseudo: 'Emma',
    age: 25,
    city: 'Marseille · Vieux-Port',
    imageUrl: friendHeadshot('f3'),
    eventsInCommon: 15,
    mainChatConversationId: 'dm-f3',
    bio: 'Culture et expos. Musée Orsay avec toi et le groupe : un souvenir cool — la prochaine c’est chez moi côté sud !',
    memberSince: '2024',
    verified: false,
    stats: { reliability: 4.8, events: 31, friends: 44 },
    badges: ['Curieuse', 'Sociable'],
  },
  {
    profilId: 'f4',
    name: 'Hugo D.',
    pseudo: 'Hugo',
    age: 29,
    city: 'Toulouse · Carmes',
    imageUrl: friendHeadshot('f4'),
    eventsInCommon: 6,
    mainChatConversationId: 'dm-f4',
    bio: 'Ingé le jour, apéros Nel le soir. On se croise souvent sur les mêmes afterworks — dis-moi quand tu es dans le coin.',
    memberSince: '2025',
    verified: false,
    stats: { reliability: 4.5, events: 11, friends: 29 },
    badges: ['Convivial'],
  },
  {
    profilId: 'f5',
    name: 'Sarah K.',
    pseudo: 'Sarah',
    age: 27,
    city: 'Bordeaux · Chartrons',
    imageUrl: friendHeadshot('f5'),
    eventsInCommon: 3,
    mainChatConversationId: 'dm-f5',
    bio: 'Vin et sorties chill. Peu de sorties communes pour l’instant mais le feeling était là — on remet ça vite.',
    memberSince: '2025',
    verified: true,
    stats: { reliability: 5.0, events: 9, friends: 21 },
    badges: ['Nouvelle', 'Fiable'],
  },
];

// ── Helpers ──
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

export function formatVisitTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

export function formatBadgeCount(n: number): string {
  if (n > 99) return '99+';
  return String(n);
}

export function formatSuggestionCaption(pseudo: string, age: number): string {
  return `${pseudo}, ${age}`;
}
