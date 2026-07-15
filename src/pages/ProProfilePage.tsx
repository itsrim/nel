import { useState, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  Award,
  Briefcase,
  Calendar,
  ChevronLeft,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { ReportModal } from "../components/ReportModal";
import { ProProfileDetails } from "../components/ProProfileDetails";
import { useTranslation } from "../i18n/useTranslation";
import { proDemoStats, proFullName } from "../data/mockProfessionals";
import { getProfessionalById, useProsStore } from "../store/useProsStore";
import { adminSetProfessionalVerified } from "../lib/proVerification";
import "./OtherProfilePage.css";
import "./ProProfilePage.css";
import "../components/ProContactLinks.css";

interface ProProfilePageProps {
  id: string;
}

export function ProProfilePage({ id }: ProProfilePageProps) {
  const { t } = useTranslation();
  const { openDetail, setActiveTab, closeDetail } = useNavigationStore();
  const { openOrCreateDmConversation, isAdmin } = useMessagingStore();
  const professionals = useProsStore((s) => s.professionals);
  const {
    viewerProfileDisplayName,
    viewerProfileAvatarUrl,
    viewerProfileCity,
    viewerProAddress,
    viewerProLat,
    viewerProLng,
    viewerProWebsiteUrl,
    viewerProSocialUrl,
    viewerProPhone,
  } = useMessagingStore();
  const [reportOpen, setReportOpen] = useState(false);

  const pro = useMemo(
    () => getProfessionalById(id),
    [
      id,
      professionals,
      viewerProfileDisplayName,
      viewerProfileAvatarUrl,
      viewerProfileCity,
      viewerProAddress,
      viewerProLat,
      viewerProLng,
      viewerProWebsiteUrl,
      viewerProSocialUrl,
      viewerProPhone,
    ],
  );

  const handleAdminVerifiedToggle = useCallback(
    (verified: boolean) => {
      if (!pro) return;
      adminSetProfessionalVerified(pro, verified);
    },
    [pro],
  );
  if (!pro) return null;

  const stats = proDemoStats(pro.id);
  const name = proFullName(pro);

  const handleContact = () => {
    const conversationId = openOrCreateDmConversation({
      profilId: pro.id,
      displayName: name,
      avatarUrl: pro.imageUrl,
    });
    setActiveTab("chat");
    openDetail("chat", conversationId);
  };

  return (
    <div className="other-profile-page pro-profile-page">
      <div className="op-hero">
        <img src={pro.imageUrl} alt={name} className="op-hero-image" />
        <div className="op-hero-gradient" />

        <header className="op-header">
          <button
            type="button"
            className="op-back-btn"
            onClick={closeDetail}
            aria-label={t("back")}
          >
            <ChevronLeft size={28} color="currentColor" />
          </button>
          <button
            type="button"
            className="op-report-btn"
            onClick={() => setReportOpen(true)}
            aria-label={t("reportEventAriaLabel")}
          >
            <AlertTriangle size={24} color="#FFCC00" />
          </button>
        </header>

        <div className="op-hero-content">
          <h1 className="op-title">{name}</h1>
          <div className="pro-profile-badges">
            <div className="op-pro-row">
              <Briefcase size={18} color="#FFB300" />
              <span>{pro.categoryLabel}</span>
            </div>
            {pro.verified ? (
              <div className="op-verified-row">
                <ShieldCheck size={18} color="#34C759" />
                <span>{t("verified")}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="op-content">
        <div className="op-bio-card">
          <p className="op-bio-text">{pro.description}</p>
          <div className="op-divider" />
          <ProProfileDetails
            city={pro.city}
            address={pro.address}
            websiteUrl={pro.websiteUrl}
            socialUrl={pro.socialUrl}
            phone={pro.phone}
            className="pro-contact-links--profile"
          />
          <div className="op-info-row">
            <Calendar size={18} color="#8E8E93" />
            <span>{t("memberSince")}</span>
          </div>
        </div>

        <div className="op-stats-row">
          <div className="op-stat-cell">
            <span className="op-stat-value">{stats.reliability.toFixed(1)}</span>
            <span className="op-stat-label">{t("reliability")}</span>
          </div>
          <div className="op-stat-cell">
            <span className="op-stat-value">{stats.events}</span>
            <span className="op-stat-label">{t("events")}</span>
          </div>
          <div className="op-stat-cell">
            <span className="op-stat-value">{stats.clients}</span>
            <span className="op-stat-label">{t("proClientsLabel")}</span>
          </div>
        </div>

        <h2 className="op-section-title">{t("badges")}</h2>
        <div className="op-badges-wrap">
          <div className="op-badge-pill">
            <Award size={16} color="#FFB300" />
            <span>{t("professional")}</span>
          </div>
          {pro.verified ? (
            <div className="op-badge-pill">
              <ShieldCheck size={16} color="#34C759" />
              <span>{t("verified")}</span>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="pro-profile-contact-btn"
          onClick={handleContact}
        >
          <MessageCircle size={20} aria-hidden />
          {t("proContactButton")}
        </button>

        {isAdmin ? (
          <div className="pro-verify-admin">
            <h2 className="op-section-title">{t("adminProVerifiedTitle")}</h2>
            <label className="op-admin-check pro-verify-admin-check">
              <input
                type="checkbox"
                className="switch"
                checked={!!pro.verified}
                onChange={(e) => handleAdminVerifiedToggle(e.target.checked)}
                aria-label={t("verified")}
              />
              <span>{t("verified")}</span>
            </label>
            <p className="pro-verify-admin-hint">{t("adminProVerifiedSub")}</p>
          </div>
        ) : null}
      </div>

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        title={t("reportProfile")}
        kind="profile"
        subjectId={pro.id}
        subjectLabel={name}
      />
    </div>
  );
}
