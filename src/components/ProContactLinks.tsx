import { Globe, Link2, Phone } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import type { ProContactFields } from "../lib/proContact";
import {
  hasProContact,
  normalizeSocialUrl,
  normalizeWebsiteUrl,
  phoneTelHref,
} from "../lib/proContact";
import "./ProContactLinks.css";

interface ProContactLinksProps {
  contact: ProContactFields;
  className?: string;
}

export function ProContactLinks({ contact, className = "" }: ProContactLinksProps) {
  const { t } = useTranslation();
  if (!hasProContact(contact)) return null;

  const website = contact.websiteUrl?.trim();
  const social = contact.socialUrl?.trim();
  const phone = contact.phone?.trim();

  return (
    <div className={`pro-contact-links ${className}`.trim()}>
      {website ? (
        <a
          href={normalizeWebsiteUrl(website)}
          className="pro-contact-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Globe size={18} aria-hidden />
          <span>{t("proWebsiteLabel")}</span>
        </a>
      ) : null}
      {social ? (
        <a
          href={normalizeSocialUrl(social)}
          className="pro-contact-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Link2 size={18} aria-hidden />
          <span>{t("proSocialLabel")}</span>
        </a>
      ) : null}
      {phone ? (
        <a href={phoneTelHref(phone)} className="pro-contact-link">
          <Phone size={18} aria-hidden />
          <span>{phone}</span>
        </a>
      ) : null}
    </div>
  );
}
