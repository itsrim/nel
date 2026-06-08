import { Globe, Link2, MapPin, Phone } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import type { ProContactFields } from "../lib/proContact";
import {
  hasProContact,
  normalizeSocialUrl,
  normalizeWebsiteUrl,
  phoneTelHref,
} from "../lib/proContact";
import { formatProLocation } from "../lib/proLocation";
import "./ProContactLinks.css";

interface ProProfileDetailsProps extends ProContactFields {
  city?: string;
  address?: string;
  /** Profil connecté : afficher site / réseaux / tél. même vides. */
  showEmptyContactFields?: boolean;
  className?: string;
}

export function ProProfileDetails({
  city = "",
  address = "",
  websiteUrl = "",
  socialUrl = "",
  phone = "",
  showEmptyContactFields = false,
  className = "",
}: ProProfileDetailsProps) {
  const { t } = useTranslation();
  const location = formatProLocation({ address, city });
  const website = websiteUrl?.trim();
  const social = socialUrl?.trim();
  const phoneVal = phone?.trim();
  const hasContact = hasProContact({ websiteUrl, socialUrl, phone });

  if (!location.trim() && !hasContact && !showEmptyContactFields) {
    return null;
  }

  return (
    <div className={`pro-profile-details ${className}`.trim()}>
      {location.trim() ? (
        <div className="pro-profile-detail-row">
          <MapPin size={18} color="#8E8E93" aria-hidden />
          <span>{location}</span>
        </div>
      ) : null}
      {showEmptyContactFields || website ? (
        website ? (
          <a
            href={normalizeWebsiteUrl(website)}
            className="pro-contact-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Globe size={18} aria-hidden />
            <span>{t("proWebsiteLabel")}</span>
          </a>
        ) : (
          <div className="pro-profile-detail-row pro-profile-detail-row--muted">
            <Globe size={18} color="#8E8E93" aria-hidden />
            <span>{t("proWebsiteLabel")}</span>
            <span className="pro-profile-detail-empty">—</span>
          </div>
        )
      ) : null}
      {showEmptyContactFields || social ? (
        social ? (
          <a
            href={normalizeSocialUrl(social)}
            className="pro-contact-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Link2 size={18} aria-hidden />
            <span>{t("proSocialLabel")}</span>
          </a>
        ) : (
          <div className="pro-profile-detail-row pro-profile-detail-row--muted">
            <Link2 size={18} color="#8E8E93" aria-hidden />
            <span>{t("proSocialLabel")}</span>
            <span className="pro-profile-detail-empty">—</span>
          </div>
        )
      ) : null}
      {showEmptyContactFields || phoneVal ? (
        phoneVal ? (
          <a href={phoneTelHref(phoneVal)} className="pro-contact-link">
            <Phone size={18} aria-hidden />
            <span>{phoneVal}</span>
          </a>
        ) : (
          <div className="pro-profile-detail-row pro-profile-detail-row--muted">
            <Phone size={18} color="#8E8E93" aria-hidden />
            <span>{t("proPhoneLabel")}</span>
            <span className="pro-profile-detail-empty">—</span>
          </div>
        )
      ) : null}
    </div>
  );
}
