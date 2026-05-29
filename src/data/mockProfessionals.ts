import type { ProContactFields } from "../lib/proContact";
import { proContactSearchText } from "../lib/proContact";
import { proCoordinates } from "../lib/proCoordinates";

export type ProCategory =
  | "therapeute"
  | "coiffeur"
  | "herboriste"
  | "sante"
  | "psychique"
  | "corps"
  | "danse"
  | "psychologue";

export interface MockProfessional extends ProContactFields {
  id: string;
  firstName: string;
  lastName: string;
  category: ProCategory;
  /** Libellé affiché (filtre + carte). */
  categoryLabel: string;
  city: string;
  description: string;
  imageUrl: string;
  /** Latitude (WGS84) — dérivée de la ville si absente. */
  lat?: number;
  /** Longitude (WGS84). */
  lng?: number;
  /** Position sur la carte mock (%). */
  mapX: number;
  mapY: number;
  verified?: boolean;
}

const img = (seed: string) => `https://i.pravatar.cc/400?u=nel-pro-${seed}`;

function contactFor(id: string, slug: string): ProContactFields {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  const a = String(10 + (n % 80)).padStart(2, "0");
  const b = String(20 + ((n * 3) % 70)).padStart(2, "0");
  const c = String(30 + ((n * 7) % 60)).padStart(2, "0");
  return {
    websiteUrl: `https://www.${slug}-pro.fr`,
    socialUrl: `https://instagram.com/${slug}.nel`,
    phone: `+33 6 ${a} ${b} ${c}`,
  };
}

export const PRO_CATEGORY_OPTIONS: { id: ProCategory; label: string }[] = [
  { id: "therapeute", label: "Thérapeute" },
  { id: "coiffeur", label: "Coiffeur·se" },
  { id: "herboriste", label: "Herboriste" },
  { id: "sante", label: "Santé" },
  { id: "psychique", label: "Psychique" },
  { id: "corps", label: "Corps" },
  { id: "danse", label: "Danse" },
  { id: "psychologue", label: "Psychologue" },
];

const _MOCK_PROFESSIONALS_RAW: Omit<MockProfessional, keyof ProContactFields>[] = [
  {
    id: "pro_01",
    firstName: "Camille",
    lastName: "Renard",
    category: "therapeute",
    categoryLabel: "Thérapeute",
    city: "Paris 11e",
    description:
      "Thérapeute holistique — accompagnement stress, burn-out et équilibre émotionnel. Séances individuelles et cercles de parole.",
    imageUrl: img("01"),
    mapX: 42,
    mapY: 38,
    verified: true,
  },
  {
    id: "pro_02",
    firstName: "Marc",
    lastName: "Duval",
    category: "psychologue",
    categoryLabel: "Psychologue",
    city: "Lyon 2e",
    description:
      "Psychologue clinicien TCC. Anxiété, relations, estime de soi. Consultations en cabinet et visio.",
    imageUrl: img("02"),
    mapX: 58,
    mapY: 52,
    verified: true,
  },
  {
    id: "pro_03",
    firstName: "Léa",
    lastName: "Moreau",
    category: "coiffeur",
    categoryLabel: "Coiffeur·se",
    city: "Bordeaux",
    description:
      "Coiffeuse visagiste — coupes naturelles, balayage botanique, soins cuir chevelu. Salon éco-responsable.",
    imageUrl: img("03"),
    mapX: 28,
    mapY: 68,
  },
  {
    id: "pro_04",
    firstName: "Amine",
    lastName: "Belkacem",
    category: "herboriste",
    categoryLabel: "Herboriste",
    city: "Montpellier",
    description:
      "Herboriste diplômé — plantes médicinales, tisanes sur mesure, ateliers cueillette et pharmacopée douce.",
    imageUrl: img("04"),
    mapX: 35,
    mapY: 78,
    verified: true,
  },
  {
    id: "pro_05",
    firstName: "Sophie",
    lastName: "Arnaud",
    category: "sante",
    categoryLabel: "Santé",
    city: "Nantes",
    description:
      "Naturopathe — hygiène de vie, nutrition, jeûne intermittent encadré. Bilan vitalité et programmes personnalisés.",
    imageUrl: img("05"),
    mapX: 18,
    mapY: 45,
  },
  {
    id: "pro_06",
    firstName: "Élise",
    lastName: "Fontaine",
    category: "psychique",
    categoryLabel: "Psychique",
    city: "Toulouse",
    description:
      "Médium intuitive — guidance bienveillante, lecture d'énergie, accompagnement de transitions de vie.",
    imageUrl: img("06"),
    mapX: 48,
    mapY: 72,
  },
  {
    id: "pro_07",
    firstName: "Thomas",
    lastName: "Girard",
    category: "corps",
    categoryLabel: "Corps",
    city: "Paris 18e",
    description:
      "Praticien en massage ayurvédique et fascias. Détente profonde, posture, récupération sportive.",
    imageUrl: img("07"),
    mapX: 38,
    mapY: 32,
    verified: true,
  },
  {
    id: "pro_08",
    firstName: "Naïma",
    lastName: "Khelifi",
    category: "danse",
    categoryLabel: "Danse",
    city: "Marseille",
    description:
      "Professeure de danse contemporaine et danse du ventre thérapeutique. Cours collectifs et privés, toutes niveaux.",
    imageUrl: img("08"),
    mapX: 62,
    mapY: 82,
  },
  {
    id: "pro_09",
    firstName: "Julien",
    lastName: "Petit",
    category: "therapeute",
    categoryLabel: "Thérapeute",
    city: "Lille",
    description:
      "Sophrologue certifié — gestion du sommeil, préparation mentale, relaxation dynamique en entreprise.",
    imageUrl: img("09"),
    mapX: 52,
    mapY: 22,
  },
  {
    id: "pro_10",
    firstName: "Claire",
    lastName: "Bernard",
    category: "psychologue",
    categoryLabel: "Psychologue",
    city: "Strasbourg",
    description:
      "Psychologue pour adolescents et jeunes adultes. EMDR, troubles anxieux, orientation scolaire.",
    imageUrl: img("10"),
    mapX: 72,
    mapY: 28,
    verified: true,
  },
  {
    id: "pro_11",
    firstName: "Hugo",
    lastName: "Martin",
    category: "coiffeur",
    categoryLabel: "Coiffeur·se",
    city: "Paris 10e",
    description:
      "Barbier & coiffeur — taille de barbe, rasage traditionnel, coupes courtes. Ambiance speakeasy.",
    imageUrl: img("11"),
    mapX: 45,
    mapY: 42,
  },
  {
    id: "pro_12",
    firstName: "Inès",
    lastName: "Lopez",
    category: "corps",
    categoryLabel: "Corps",
    city: "Nice",
    description:
      "Coach Pilates reformer et stretching fascial. Renforcement doux, mobilité, prévention des douleurs.",
    imageUrl: img("12"),
    mapX: 78,
    mapY: 88,
  },
  {
    id: "pro_13",
    firstName: "Yann",
    lastName: "Rousseau",
    category: "herboriste",
    categoryLabel: "Herboriste",
    city: "Rennes",
    description:
      "Herboriste & aromathérapeute — huiles essentielles, synergies saisonnières, conseils phytothérapie.",
    imageUrl: img("13"),
    mapX: 22,
    mapY: 58,
  },
  {
    id: "pro_14",
    firstName: "Amina",
    lastName: "Diallo",
    category: "danse",
    categoryLabel: "Danse",
    city: "Paris 20e",
    description:
      "Danse africaine & afro-contemporain — workshops, événements, team building rythmé.",
    imageUrl: img("14"),
    mapX: 55,
    mapY: 35,
    verified: true,
  },
  {
    id: "pro_15",
    firstName: "Vincent",
    lastName: "Chevalier",
    category: "sante",
    categoryLabel: "Santé",
    city: "Grenoble",
    description:
      "Praticien en respiration consciente et cohérence cardiaque. Ateliers collectifs en plein air.",
    imageUrl: img("15"),
    mapX: 65,
    mapY: 58,
  },
  {
    id: "pro_16",
    firstName: "Morgane",
    lastName: "Silvestre",
    category: "psychique",
    categoryLabel: "Psychique",
    city: "Annecy",
    description:
      "Cartomancienne & oracle — lectures intuitives, rituels de nouvelle lune, accompagnement spirituel.",
    imageUrl: img("16"),
    mapX: 68,
    mapY: 42,
  },
];

export const MOCK_PROFESSIONALS: MockProfessional[] = _MOCK_PROFESSIONALS_RAW.map(
  (p) => {
    const coords = proCoordinates(p);
    return {
      ...p,
      lat: coords.lat,
      lng: coords.lng,
      ...contactFor(
        p.id,
        `${p.firstName.toLowerCase()}-${p.lastName.toLowerCase()}`,
      ),
    };
  },
);

export function proFullName(p: MockProfessional): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function proSearchHaystack(p: MockProfessional): string {
  return `${p.firstName} ${p.lastName} ${p.city} ${p.description} ${p.categoryLabel} ${p.category} ${proContactSearchText(p)}`;
}

/** Stats démo dérivées de l'id (stable). */
export function proDemoStats(id: string): {
  reliability: number;
  events: number;
  clients: number;
} {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return {
    reliability: 4.2 + (n % 8) / 10,
    events: 5 + (n % 40),
    clients: 20 + (n % 180),
  };
}
