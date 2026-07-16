import { useState, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  Award,
  Briefcase,
  Calendar,
  ChevronLeft,
  MessageCircle,
  ShieldCheck,
  Tags,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { ReportModal } from "../components/ReportModal";
import { ProProfileDetails } from "../components/ProProfileDetails";
import { useTranslation } from "../i18n/useTranslation";
import { proFullName } from "../data/mockProfessionals";
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
          <label className="pro-contact-edit-label">
            <Briefcase size={16} aria-hidden />
            <span>{t("proJobLabel")}</span>
          </label>
          <p className="bio-text op-bio-text">{pro.description || "—"}</p>
          <div className="op-divider" />
          <div className="member-since">
            <Calendar size={16} color="#8E8E93" aria-hidden />
            <span>{t("memberSince")}</span>
          </div>
          <label className="pro-contact-edit-label">
            <Tags size={16} aria-hidden />
            <span>{t("proCategoryTypeLabel")}</span>
          </label>
          <div className="member-since pro-category-display">
            <span>{pro.categoryLabel}</span>
          </div>
          <ProProfileDetails
            city={pro.city}
            address={pro.address}
            websiteUrl={pro.websiteUrl}
            socialUrl={pro.socialUrl}
            phone={pro.phone}
            showEmptyContactFields
            className="pro-contact-links--profile"
          />
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
