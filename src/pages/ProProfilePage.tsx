import { useState, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  Award,
  Briefcase,
  Calendar,
  ChevronLeft,
  HeartCrack,
  MessageCircle,
  ShieldCheck,
  Tags,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { useAuthStore } from "../store/useAuthStore";
import { ReportModal } from "../components/ReportModal";
import { ProProfileDetails } from "../components/ProProfileDetails";
import { useTranslation } from "../i18n/useTranslation";
import { proFullName } from "../data/mockProfessionals";
import { getProfessionalById, useProsStore } from "../store/useProsStore";
import { adminSetProfessionalVerified } from "../lib/proVerification";
import { hasReachedDailyFriendRequestLimit, friendRequestDailyLimitTranslationKey } from "../lib/eventDateKey";
import { isSelfProfilId } from "../lib/friendGuards";
import "./OtherProfilePage.css";
import "./ProProfilePage.css";
import "../components/ProContactLinks.css";

interface ProProfilePageProps {
  id: string;
}

export function ProProfilePage({ id }: ProProfilePageProps) {
  const { t } = useTranslation();
  const { openDetail, setActiveTab, closeDetail } = useNavigationStore();
  const user = useAuthStore((s) => s.user);
  const {
    openOrCreateDmConversation,
    isAdmin,
    friends,
    sendFriendRequest,
    removeMutualFriend,
    friendRequestSentProfilIds,
    friendRequestRejectedProfilIds,
    friendRequestDailySentDateKey,
    nelDemoIsPremium,
    viewerPremiumExpiresAt,
    viewerProfileIsPro,
    viewerProExpiresAt,
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
  const professionals = useProsStore((s) => s.professionals);
  const [reportOpen, setReportOpen] = useState(false);

  const entitlementState = useMemo(
    () => ({
      isAdmin,
      nelDemoIsPremium,
      viewerPremiumExpiresAt,
      viewerProfileIsPro,
      viewerProExpiresAt,
    }),
    [
      isAdmin,
      nelDemoIsPremium,
      viewerPremiumExpiresAt,
      viewerProfileIsPro,
      viewerProExpiresAt,
    ],
  );

  const isOwnProfile = isSelfProfilId(id, user?.id);
  const isMutualFriend = friends.some(
    (f) => f.profilId === id && f.mutualFriend === true,
  );
  const requestSent = friendRequestSentProfilIds.includes(id);
  const requestRejected = friendRequestRejectedProfilIds.includes(id);
  const dailyFriendRequestLimitReached = hasReachedDailyFriendRequestLimit(
    friendRequestDailySentDateKey,
    entitlementState,
  );
  const dailyFriendRequestLimitKey =
    friendRequestDailyLimitTranslationKey(entitlementState);

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

        {isMutualFriend ? (
          <button
            type="button"
            className="pro-profile-contact-btn"
            onClick={handleContact}
          >
            <MessageCircle size={20} aria-hidden />
            {t("proContactButton")}
          </button>
        ) : null}

        {!isOwnProfile ? (
          <div className="op-actions">
            {isMutualFriend ? (
              <button
                type="button"
                className="op-btn-remove"
                onClick={() => {
                  if (window.confirm("Retirer cette personne de vos amis ?")) {
                    removeMutualFriend(id);
                  }
                }}
              >
                <UserMinus size={20} />
                <span>Retirer des amis</span>
              </button>
            ) : requestRejected ? (
              <button
                type="button"
                className="op-btn-friend-state op-btn-friend-state--rejected"
                disabled
              >
                <HeartCrack size={20} color="#FF9F0A" />
                <span>Demande d’ami refusée</span>
              </button>
            ) : requestSent ? (
              <button
                type="button"
                className="op-btn-friend-state op-btn-friend-state--sent"
                disabled
              >
                <UserPlus size={20} color="#8E8E93" />
                <span>Demande envoyée</span>
              </button>
            ) : dailyFriendRequestLimitReached && dailyFriendRequestLimitKey ? (
              <button
                type="button"
                className="op-btn-friend-state op-btn-friend-state--daily-limit"
                disabled
              >
                <UserPlus size={20} color="#8E8E93" />
                <span>{t(dailyFriendRequestLimitKey)}</span>
              </button>
            ) : (
              <button
                type="button"
                className="op-btn-friend-request"
                onClick={() => sendFriendRequest(id)}
              >
                <UserPlus size={20} />
                <span>Demande d’ami</span>
              </button>
            )}
          </div>
        ) : null}

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
