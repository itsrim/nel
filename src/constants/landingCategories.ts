import type { TranslationKey } from "../i18n/translations";
import {
  DEFAULT_EVENT_COVER_THEMES,
  getEventThemeBadgeColors,
} from "./defaultEventCoverThemes";

export type LandingCategory = {
  id: string;
  tag: string;
  imageUrl: string;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  badgeBg: string;
  badgeFg: string;
};

/** Les 12 thèmes couverture → cartes landing (images + textes i18n). */
export const LANDING_CATEGORIES: LandingCategory[] = DEFAULT_EVENT_COVER_THEMES.map(
  (theme) => {
    const id = theme.id;
    const colors = getEventThemeBadgeColors(theme.tag);
    const keyBase = id.replace(/-/g, "_") as string;
    return {
      id,
      tag: theme.tag,
      imageUrl: theme.imageUrl,
      labelKey: `landingCat_${keyBase}_label` as TranslationKey,
      descKey: `landingCat_${keyBase}_desc` as TranslationKey,
      badgeBg: colors.bg,
      badgeFg: colors.fg,
    };
  },
);
