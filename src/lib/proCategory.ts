import {
  DEFAULT_PRO_CATEGORY,
  PRO_CATEGORY_OPTIONS,
  resolveProCategoryFields,
  type ProCategory,
} from "../data/mockProfessionals";

export { DEFAULT_PRO_CATEGORY, PRO_CATEGORY_OPTIONS, resolveProCategoryFields };
export type { ProCategory };

export function isProCategory(value: string): value is ProCategory {
  return PRO_CATEGORY_OPTIONS.some((o) => o.id === value);
}
