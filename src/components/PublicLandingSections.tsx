import {
  CalendarHeart,
  Handshake,
  MapPin,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import { LANDING_CATEGORIES } from "../constants/landingCategories";
import "./PublicLandingSections.css";

type PublicLandingSectionsProps = {
  onScrollToAuth: () => void;
};

const HOW_STEPS: {
  icon: LucideIcon;
  titleKey:
    | "landingHow1Title"
    | "landingHow2Title"
    | "landingHow3Title";
  descKey: "landingHow1Desc" | "landingHow2Desc" | "landingHow3Desc";
}[] = [
  { icon: Users, titleKey: "landingHow1Title", descKey: "landingHow1Desc" },
  { icon: CalendarHeart, titleKey: "landingHow2Title", descKey: "landingHow2Desc" },
  { icon: Handshake, titleKey: "landingHow3Title", descKey: "landingHow3Desc" },
];

const PRO_BULLETS: Array<"landingProBullet1" | "landingProBullet2" | "landingProBullet3" | "landingProBullet4"> = [
  "landingProBullet1",
  "landingProBullet2",
  "landingProBullet3",
  "landingProBullet4",
];

export function PublicLandingSections({ onScrollToAuth }: PublicLandingSectionsProps) {
  const { t } = useTranslation();

  return (
    <>
      <section className="landing-section" id="decouvrir">
        <div className="landing-section-inner">
          <p className="landing-eyebrow">{t("landingEyebrowCategories")}</p>
          <h2 className="landing-section-title">{t("landingCategoriesTitle")}</h2>
          <p className="landing-section-lead">{t("landingCategoriesLead")}</p>

          <div className="landing-categories-grid">
            {LANDING_CATEGORIES.map((cat) => (
              <article key={cat.id} className="landing-category-card">
                <div className="landing-category-media">
                  <img src={cat.imageUrl} alt="" loading="lazy" />
                  <span
                    className="landing-category-chip"
                    style={{ backgroundColor: cat.badgeBg, color: cat.badgeFg }}
                  >
                    #{cat.tag}
                  </span>
                </div>
                <div className="landing-category-body">
                  <h3>{t(cat.labelKey)}</h3>
                  <p>{t(cat.descKey)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--soft" id="comment">
        <div className="landing-section-inner">
          <p className="landing-eyebrow">{t("landingEyebrowHow")}</p>
          <h2 className="landing-section-title">{t("landingHowTitle")}</h2>
          <p className="landing-section-lead">{t("landingHowLead")}</p>

          <div className="landing-steps">
            {HOW_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.titleKey} className="landing-step-card">
                  <div className="landing-step-num" aria-hidden>
                    {index + 1}
                  </div>
                  <Icon size={28} className="landing-step-icon" aria-hidden />
                  <h3>{t(step.titleKey)}</h3>
                  <p>{t(step.descKey)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-section" id="professionnels">
        <div className="landing-section-inner landing-pros-layout">
          <div className="landing-pros-copy">
            <p className="landing-eyebrow">{t("landingEyebrowPros")}</p>
            <h2 className="landing-section-title">{t("landingProsTitle")}</h2>
            <p className="landing-section-lead">{t("landingProsLead")}</p>
            <ul className="landing-pros-list">
              {PRO_BULLETS.map((key) => (
                <li key={key}>
                  <Sparkles size={18} aria-hidden />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="landing-cta-btn" onClick={onScrollToAuth}>
              {t("landingProsCta")}
            </button>
          </div>
          <div className="landing-pros-visual" aria-hidden>
            <div className="landing-pros-card landing-pros-card--a">
              <img src={LANDING_CATEGORIES[0]?.imageUrl} alt="" />
              <span>{t("landingCat_bien_etre_label")}</span>
            </div>
            <div className="landing-pros-card landing-pros-card--b">
              <img src={LANDING_CATEGORIES[5]?.imageUrl} alt="" />
              <span>{t("landingCat_therapy_label")}</span>
            </div>
            <div className="landing-pros-card landing-pros-card--c">
              <img src={LANDING_CATEGORIES[3]?.imageUrl} alt="" />
              <span>{t("landingCat_formation_label")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--values">
        <div className="landing-section-inner landing-values">
          <MapPin size={32} aria-hidden />
          <h2>{t("landingValuesTitle")}</h2>
          <p>{t("landingValuesText")}</p>
        </div>
      </section>

      <section className="landing-section landing-section--cta">
        <div className="landing-section-inner">
          <div className="landing-cta-panel">
            <h2>{t("landingCtaTitle")}</h2>
            <p>{t("landingCtaText")}</p>
            <button type="button" className="landing-cta-btn landing-cta-btn--large" onClick={onScrollToAuth}>
              {t("landingCtaButton")}
            </button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p className="landing-footer-brand">Happy Let&apos;s Go</p>
        <p className="landing-footer-tagline">{t("landingFooterTagline")}</p>
        <p className="landing-footer-copy">© {new Date().getFullYear()} Happy Let&apos;s Go</p>
      </footer>
    </>
  );
}
