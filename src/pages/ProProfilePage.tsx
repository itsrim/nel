import { useState } from "react";
import {
  AlertTriangle,
  Award,
  Briefcase,
  Calendar,
  ChevronLeft,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { ReportModal } from "../components/ReportModal";
import { ProContactLinks } from "../components/ProContactLinks";
import { useTranslation } from "../i18n/useTranslation";
import { proDemoStats, proFullName } from "../data/mockProfessionals";
import { getProfessionalById } from "../store/useProsStore";
import "./OtherProfilePage.css";
import "./ProProfilePage.css";
import "../components/ProContactLinks.css";

interface ProProfilePageProps {
  id: string;
}

export function ProProfilePage({ id }: ProProfilePageProps) {
  const { t } = useTranslation();
  const { openDetail, setActiveTab, closeDetail } = useNavigationStore();
  const { openOrCreateDmConversation } = useMessagingStore();
  const [reportOpen, setReportOpen] = useState(false);

  const pro = getProfessionalById(id);
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
            <ChevronLeft size={28} color="#fff" />
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
          <div className="op-info-row">
            <MapPin size={18} color="#8E8E93" />
            <span>{pro.city}</span>
          </div>
          <div className="op-info-row">
            <Calendar size={18} color="#8E8E93" />
            <span>{t("memberSince")}</span>
          </div>
          <ProContactLinks contact={pro} className="pro-contact-links--profile" />
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
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        kind="profile"
        subjectId={pro.id}
        subjectLabel={name}
      />
    </div>
  );
}
