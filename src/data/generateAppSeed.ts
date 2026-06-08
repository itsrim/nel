/**
 * Données de démo volumineuses : 99 profils, 56 sorties (4/j × 14 j),
 * 99 conversations (56 groupes sorties + 43 DM), messages cohérents.
 * RNG déterministe (seed fixe) pour des rendus stables au build.
 */
import type { Event, Conversation, Friend, GroupMember } from './mockData';
import { formatEventSectionTitle } from '../lib/eventDateKey';
import { buildEventParticipantAvatars } from '../lib/eventParticipantAvatars';
import { buildEventPublicUrl } from '../lib/eventPublicUrl';

const SEED = 20260415;

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(d: Date, delta: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + delta);
  return x;
}

function shortFrenchDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

const FIRST = [
  'Lucas', 'Emma', 'Léa', 'Hugo', 'Chloé', 'Thomas', 'Camille', 'Julien', 'Manon', 'Nathan',
  'Sarah', 'Alexandre', 'Inès', 'Maxime', 'Zoé', 'Paul', 'Julie', 'Antoine', 'Clara', 'Louis',
  'Laura', 'Gabriel', 'Élise', 'Romain', 'Anaïs', 'Mathis', 'Océane', 'Benjamin', 'Margot', 'Ethan',
  'Charlotte', 'Noah', 'Alice', 'Tom', 'Lisa', 'Adam', 'Éva', 'Victor', 'Nina', 'Oscar',
  'Rose', 'Samuel', 'Jade', 'Théo', 'Lola', 'Hugo', 'Anna', 'Enzo', 'Mia', 'Liam',
];
const LAST = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
  'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier',
  'Girard', 'Bonnet', 'Dupont', 'Lambert', 'Fontaine', 'Rousseau', 'Vincent', 'Muller', 'Lefevre', 'Faure',
  'André', 'Mercier', 'Blanc', 'Guerin', 'Boyer', 'Garnier', 'Chevalier', 'Francois', 'Legrand', 'Gauthier',
];
const CITY = [
  'Paris · 11e', 'Lyon · Presqu’île', 'Marseille · Vieux-Port', 'Toulouse · Carmes', 'Bordeaux · Chartrons',
  'Nantes · centre', 'Strasbourg · Krutenau', 'Lille · Vieux-Lille', 'Nice · Cimiez', 'Rennes · Thabor',
  'Montpellier · Écusson', 'Grenoble · Championnet', 'Dijon · centre', 'Reims · centre', 'Angers · Doutre',
];
const BADGE_POOL = ['Ponctuelle', 'Curieuse', 'Organisatrice', 'Explorateur', 'Sociable', 'Photographe', 'Foodie', 'Sportive', 'Calme', 'Bavarde'];
const BIO_SNIP = [
  'Sur Nel pour des sorties sans prise de tête — rando, apéros, culture.',
  'J’aime alterner sport le matin et expo l’après-midi quand je peux.',
  'Toujours partant·e pour découvrir un nouveau quartier ou une micro-brasserie.',
  'Profil vérifié côté fiabilité : j’annonce si je dois décaler, zéro ghost.',
  'Fan de petits groupes (6–8) plutôt que les énormes rassemblements.',
];

const ACT_TITLES = [
  ['Trail urbain', 'Canal Saint-Martin'],
  ['Apéro nel', 'Rooftop Marais'],
  ['Brunch & sketch', 'Quai de la Loire'],
  ['Yoga matinal', 'Parc des Buttes'],
  ['Visite guidée', 'Petit Palais'],
  ['Pétanque chill', 'Place des Vosges'],
  ['Blind test', 'Bar Oberkampf'],
  ['Photo argentique', 'Belleville'],
  ['Cuisine du monde', 'Atelier Bastille'],
  ['Jazz & vin', 'Cave du 11e'],
  ['Vélo doux', 'Berges Seine'],
  ['Boardgames', 'Café latin'],
  ['Stand-up', 'Comedy club'],
  ['Marché + picnic', 'Aligre'],
  ['Escalade indoor', 'Mur 20e'],
];

const GRADS: readonly [string, string][] = [
  ['#FF6B35', '#FF4081'],
  ['#AB47BC', '#7C4DFF'],
  ['#26C6DA', '#00BFA5'],
  ['#66BB6A', '#43A047'],
  ['#42A5F5', '#1E88E5'],
  ['#EC407A', '#F48FB1'],
  ['#FFC107', '#FF9800'],
  ['#9B5DE5', '#C23B8E'],
];

const img = (seed: number) => `https://picsum.photos/seed/nel${seed}/600/400`;

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

function buildFriends(rng: () => number, placeholderGroupId: string): Friend[] {
  const core: Friend[] = [
    {
      profilId: 'f1',
      name: 'Marie L.',
      pseudo: 'Marie',
      age: 28,
      city: 'Paris · 11e',
      imageUrl: friendHeadshot('f1'),
      mutualFriend: true,
      eventsInCommon: 12,
      mainChatConversationId: 'dm-f1',
      bio: 'Foodie et italienne dans l’âme. On s’est connus sur l’atelier cuisine — toujours partante pour un resto ou un marché avec toi.',
      memberSince: '2024',
      verified: true,
      isPro: true,
      websiteUrl: "https://www.marie-atelier.fr",
      socialUrl: "https://instagram.com/marie.nel",
      phone: "+33 6 12 34 56 78",
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
      mutualFriend: true,
      eventsInCommon: 8,
      mainChatConversationId: 'dm-f2',
      bio: 'Trail et photo le week-end. Même groupe que toi sur plusieurs sorties Nel — on enchaîne les bons plans rando.',
      memberSince: '2023',
      verified: true,
      isPro: true,
      websiteUrl: "https://www.lucas-trail.fr",
      socialUrl: "https://instagram.com/lucas.nel",
      phone: "+33 6 98 76 54 32",
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
      mutualFriend: true,
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
      mutualFriend: true,
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
      mutualFriend: true,
      eventsInCommon: 3,
      mainChatConversationId: 'dm-f5',
      bio: 'Vin et sorties chill. Peu de sorties communes pour l’instant mais le feeling était là — on remet ça vite.',
      memberSince: '2025',
      verified: true,
      stats: { reliability: 5.0, events: 9, friends: 21 },
      badges: ['Nouvelle', 'Fiable'],
    },
  ];

  for (let i = 5; i < 99; i++) {
    const fn = FIRST[i % FIRST.length];
    const ln = LAST[(i * 7) % LAST.length];
    const name = `${fn} ${ln.charAt(0)}.`;
    const pid = `u${String(i + 1).padStart(3, '0')}`;
    const rel = Math.round((4.2 + rng() * 0.75) * 10) / 10;
    const evc = 3 + Math.floor(rng() * 40);
    const frc = 5 + Math.floor(rng() * 80);
    const badges = [BADGE_POOL[i % BADGE_POOL.length], BADGE_POOL[(i + 3) % BADGE_POOL.length]].filter(
      (b, j, a) => a.indexOf(b) === j,
    );
    core.push({
      profilId: pid,
      name,
      pseudo: fn,
      age: 20 + Math.floor(rng() * 18),
      city: CITY[i % CITY.length],
      imageUrl: `https://i.pravatar.cc/384?u=${encodeURIComponent(pid)}`,
      mutualFriend: false,
      eventsInCommon: Math.floor(rng() * 20),
      mainChatConversationId: i >= 61 ? `dm-${pid}` : placeholderGroupId,
      bio: `${BIO_SNIP[i % BIO_SNIP.length]} ${i % 4 === 0 ? '— profil Nel complet (démo).' : ''}`.trim(),
      memberSince: String(2019 + Math.floor(rng() * 7)),
      verified: rng() > 0.35,
      isPro: rng() > 0.75,
      stats: { reliability: rel, events: evc, friends: frc },
      badges,
    });
  }
  return core;
}

function memberGrad(i: number): readonly [string, string] {
  return GRADS[i % GRADS.length];
}

function buildMembers(rng: () => number, pool: Friend[], host: Friend, count: number): GroupMember[] {
  const members: GroupMember[] = [
    { id: 'me', name: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
    {
      id: `h-${host.profilId}`,
      name: host.name.split(' ')[0] ?? host.name,
      isSelf: false,
      avatarGradient: memberGrad(0),
      profilId: host.profilId,
      avatarUrl: host.imageUrl,
    },
  ];
  const used = new Set<string>([host.profilId]);
  let tries = 0;
  while (members.length < count && tries < 200) {
    tries++;
    const p = pool[Math.floor(rng() * pool.length)];
    if (used.has(p.profilId)) continue;
    used.add(p.profilId);
    members.push({
      id: `m-${p.profilId}`,
      name: p.name.split(' ')[0] ?? p.name,
      isSelf: false,
      avatarGradient: memberGrad(members.length),
      profilId: p.profilId,
      avatarUrl: p.imageUrl,
    });
  }
  return members;
}

export function buildAppSeed(): {
  events: Event[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  friends: Friend[];
} {
  const rng = mulberry32(SEED);
  const anchor = new Date();
  const firstDateKey = toDateKey(addDays(anchor, -3));
  const placeholderGroupId = `gc-${firstDateKey}-s0`;
  const friends = buildFriends(rng, placeholderGroupId);

  const dayOffsets: number[] = [];
  for (let d = -3; d <= 10; d++) dayOffsets.push(d);

  const events: Event[] = [];
  const conversations: Conversation[] = [];
  const messages: Record<string, Message[]> = {};

  const slotTimes = ['09:00', '14:00', '18:30', '20:00'];
  let imgSeed = 5000;

  let eventIndex = 0;
  for (const dayOff of dayOffsets) {
    const d = addDays(anchor, dayOff);
    const dateKey = toDateKey(d);
    const sectionDateLabel = formatEventSectionTitle(dateKey);
    const dateLabel = shortFrenchDate(d);

    for (let slot = 0; slot < 4; slot++) {
      const cid = `gc-${dateKey}-s${slot}`;
      const eid = `ge-${dateKey}-s${slot}`;
      const adminSlot = dayOff === 0 && slot === 3;
      const adminSeries = eventIndex % 11 === 0;

      const hostIdx = adminSlot || adminSeries ? 88 + (eventIndex % 10) : (eventIndex * 17 + slot * 3) % 99;
      const host = friends[hostIdx];
      const isAdminEvent = adminSlot || adminSeries;

      const [title, locHint] = ACT_TITLES[eventIndex % ACT_TITLES.length];
      const titleFull = isAdminEvent ? `Brief modération · ${title}` : `${title} — ${dateLabel.split(' ')[0]}`;
      const location = isAdminEvent ? `Nel HQ · ${locHint}` : `${locHint}, Paris`;
      const category = isAdminEvent ? 'Admin' : ['Sport', 'Culture', 'Social', 'Bien-être'][eventIndex % 4];

      const participantMax = 8 + Math.floor(rng() * 33);
      let participantCount: number;
      let waitlistEntries: Event['waitlistEntries'] | undefined;
      let manualApproval = false;
      const roll = rng();

      if (roll < 0.28) {
        participantCount = Math.min(participantMax - 1 - Math.floor(rng() * 4), participantMax - 1);
        manualApproval = rng() > 0.55;
        const wlN = 1 + Math.floor(rng() * 3);
        waitlistEntries = [];
        for (let w = 0; w < wlN; w++) {
          const fp = friends[(hostIdx + 5 + w * 7) % 99];
          waitlistEntries.push({
            id: `wl-${eid}-${w}`,
            name: fp.name,
            imageUrl: fp.imageUrl,
            profilId: fp.profilId,
            reason: manualApproval ? 'en_attente' : 'overflow',
          });
        }
        if (!manualApproval) participantCount = participantMax;
      } else if (roll < 0.58) {
        participantCount = participantMax;
        const wlN = 1 + Math.floor(rng() * 4);
        waitlistEntries = [];
        for (let w = 0; w < wlN; w++) {
          const fp = friends[(hostIdx + 2 + w * 5) % 99];
          waitlistEntries.push({
            id: `wl-${eid}-o${w}`,
            name: fp.name,
            imageUrl: fp.imageUrl,
            profilId: fp.profilId,
            reason: 'overflow',
          });
        }
      } else {
        participantCount = 2 + Math.floor(rng() * Math.max(1, participantMax - 2));
      }

      const priceLabel = rng() > 0.35 ? 'Gratuit' : `${5 + Math.floor(rng() * 45)}€`;
      const status: Event['status'] =
        rng() > 0.82 ? 'inscrire' : rng() > 0.9 ? 'en_attente' : 'inscrit';
      const isFavorite = rng() > 0.88;
      const isBeta = isAdminEvent || rng() > 0.92;
      const isPrivate = rng() > 0.94;

      const memberN = 3 + Math.floor(rng() * 5);
      const members = buildMembers(rng, friends, host, memberN);

      const hostName = isAdminEvent ? 'Nel · Admin' : host.name;
      const hostAvatar = isAdminEvent
        ? 'https://images.unsplash.com/photo-1560250097-9b9350c009fe?auto=format&fit=crop&w=384&h=384&q=80'
        : host.imageUrl;

      const visitsCount = Math.floor(rng() * 250);

      events.push({
        id: eid,
        publicUrl: buildEventPublicUrl(eid),
        title: titleFull,
        location,
        dateKey,
        timeShort: slotTimes[slot],
        dateLabel,
        sectionDateLabel,
        imageUri: img(imgSeed++),
        priceLabel,
        participantCount,
        participantMax,
        isFavorite,
        isBeta,
        status,
        notes: isAdminEvent
          ? 'Sortie réservée aux équipes admin Nel — alignement signalements & règles communautaires.'
          : `Point de rendez-vous précis dans le fil. #nel ${category.toLowerCase()}`,
        conversationId: cid,
        visitsCount,
        category,
        hostName,
        hostAvatar,
        creatorId: isAdminEvent ? undefined : host.profilId,
        participantAvatars: buildEventParticipantAvatars(
          hostAvatar,
          members,
          friends,
        ),
        price: priceLabel,
        hideAddress: rng() > 0.75,
        manualApproval,
        isPrivate,
        waitlistEntries,
      });

      const g = GRADS[eventIndex % GRADS.length];
      const updatedAt = Date.now() - Math.floor(rng() * 3600_000 * 72);
      const previewPool = [
        'Parfait pour demain ?',
        'Je ramène le gâteau !',
        'Hâte de vous voir',
        'Lien Maps dans le fil',
        'Qui a une gourde en rab ?',
        'Brief ok de mon côté',
      ];
      conversations.push({
        id: cid,
        title: titleFull,
        type: 'group',
        lastMessagePreview: previewPool[eventIndex % previewPool.length],
        avatarGradient: g,
        unreadCount: Math.floor(rng() * 6),
        updatedAt,
        isFavorite,
        memberCount: members.length,
        members,
      });

      const t0 = updatedAt - 120_000;
      const t1 = updatedAt - 60_000;
      const nm = members.find((m) => !m.isSelf && m.profilId)?.name ?? hostName;
      messages[cid] = [
        {
          id: `msg-${cid}-a`,
          conversationId: cid,
          authorName: nm,
          text: `Hello le groupe — on confirme ${slotTimes[slot]} pour « ${title} » ?`,
          sentAt: t0,
          isOwn: false,
        },
        {
          id: `msg-${cid}-b`,
          conversationId: cid,
          authorName: 'Moi',
          text: rng() > 0.5 ? 'Yes, je suis dispo.' : 'Top, merci pour l’orga !',
          sentAt: t1,
          isOwn: true,
        },
      ];
      if (rng() > 0.4) {
        messages[cid].push({
          id: `msg-${cid}-c`,
          conversationId: cid,
          authorName: nm,
          text: previewPool[(eventIndex + 2) % previewPool.length],
          sentAt: updatedAt - 15_000,
          isOwn: false,
        });
      }

      eventIndex++;
    }
  }

  const dmTemplates: { preview: string; lines: [string, string, string][] }[] = [
    {
      preview: 'On se fait ça vendredi ?',
      lines: [
        ['Moi', 'Tu seras dispo pour la sortie du soir ?'],
        ['them', 'Yes ! On se fait ça vendredi ?'],
        ['Moi', 'Parfait je réserve une place dans le groupe.'],
      ],
    },
    {
      preview: 'Merci pour le tuyau Nel',
      lines: [
        ['them', 'J’ai vu ton profil sur la sortie jazz'],
        ['Moi', 'Merci pour le tuyau Nel'],
        ['them', 'Avec plaisir, tiens-moi au courant'],
      ],
    },
    {
      preview: 'Hâte',
      lines: [
        ['them', 'Tu connais un bon spot près de la Villette ?'],
        ['Moi', 'Oui je t’envoie deux adresses'],
        ['them', 'Hâte'],
      ],
    },
  ];

  for (let i = 61; i < 99; i++) {
    const f = friends[i];
    const dmid = `dm-${f.profilId}`;
    f.mainChatConversationId = dmid;
    const tmpl = dmTemplates[i % dmTemplates.length];
    const g = GRADS[i % GRADS.length];
    const updatedAt = Date.now() - 30_000 * i;
    conversations.push({
      id: dmid,
      title: f.name,
      type: 'dm',
      lastMessagePreview: tmpl.preview,
      avatarGradient: g,
      unreadCount: i % 7 === 0 ? 1 : 0,
      updatedAt,
      isFavorite: i % 13 === 0,
      memberCount: 2,
      members: [
        { id: `u-${f.profilId}`, name: f.name, isSelf: false, avatarGradient: g, profilId: f.profilId },
        { id: 'me', name: 'Moi', isSelf: true, avatarGradient: ['#78909C', '#546E7A'] },
      ],
    });

    const [a0, a1, a2] = tmpl.lines;
    const tBase = updatedAt - 400_000;
    messages[dmid] = [
      {
        id: `${dmid}-m0`,
        conversationId: dmid,
        authorName: a0[0] === 'Moi' ? 'Moi' : f.name.split(' ')[0] ?? f.name,
        text: a0[1],
        sentAt: tBase,
        isOwn: a0[0] === 'Moi',
      },
      {
        id: `${dmid}-m1`,
        conversationId: dmid,
        authorName: a1[0] === 'Moi' ? 'Moi' : f.name.split(' ')[0] ?? f.name,
        text: a1[1],
        sentAt: tBase + 90_000,
        isOwn: a1[0] === 'Moi',
      },
      {
        id: `${dmid}-m2`,
        conversationId: dmid,
        authorName: a2[0] === 'Moi' ? 'Moi' : f.name.split(' ')[0] ?? f.name,
        text: a2[1],
        sentAt: tBase + 180_000,
        isOwn: a2[0] === 'Moi',
      },
    ];
  }

  for (let i = 5; i < 56; i++) {
    friends[i].mainChatConversationId = events[i - 5].conversationId;
  }
  for (let i = 56; i < 61; i++) {
    friends[i].mainChatConversationId = events[(i * 7) % events.length].conversationId;
  }

  const coreDmConversations: Conversation[] = [
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
  conversations.push(...coreDmConversations);

  Object.assign(messages, {
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
  });

  conversations.sort((a, b) => b.updatedAt - a.updatedAt);

  return { events, conversations, messages, friends };
}
