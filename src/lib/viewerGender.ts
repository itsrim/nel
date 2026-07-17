/** Genre déclaré à l’inscription (non affiché / non modifiable ensuite). */
export type ViewerGender = "homme" | "femme";

export const DEFAULT_VIEWER_GENDER: ViewerGender = "homme";

export function normalizeViewerGender(
  value: string | null | undefined,
): ViewerGender {
  const v = value?.trim().toLowerCase();
  return v === "femme" ? "femme" : DEFAULT_VIEWER_GENDER;
}
