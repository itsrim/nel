import { useState, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import {
  Settings,
  Camera,
  ShieldCheck,
  Pencil,
  Calendar,
  Award,
  Heart,
  Users,
  AlertTriangle,
  Clock,
  Bell,
  X,
  Plus,
  Loader2,
  Crown,
  Shield,
  Trash2,
  LogOut,
  Globe,
  FlaskConical,
} from "lucide-react";
import { useMessagingStore } from "../store/useMessagingStore";
import { useNavigationStore } from "../store/useNavigationStore";
import { useLanguageStore } from "../store/useLanguageStore";
import { useTranslation } from "../i18n/useTranslation";
import {
  getNelProfileImageKitUserKey,
  uploadLocalImageToImageKit,
} from "../lib/imagekitUpload";
import { withUrlUploadVersion } from "../lib/versionRemoteAssetUrl";
import { formatBadgeCount } from "../data/mockData";
import { isEventDateBeforeToday } from "../lib/eventDateKey";
import "./ProfilePage.css";

type TabId = "favorites" | "friends" | "history" | "notifications" | "reports";

function getNearestScrollableAncestor(
  el: HTMLElement | null,
): HTMLElement | null {
  if (!el) return null;
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    const scrollable =
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight + 1;
    if (scrollable) return node;
    node = node.parentElement;
  }
  return null;
}

function compensateScrollAfterTabStripLayout(
  strip: HTMLElement,
  viewportTopBefore: number,
) {
  const nowTop = strip.getBoundingClientRect().top;
  const delta = viewportTopBefore - nowTop;
  if (Math.abs(delta) < 0.5) return;
  const scroller =
    getNearestScrollableAncestor(strip) ??
    (document.scrollingElement as HTMLElement | null) ??
    document.documentElement;
  scroller.scrollTop += delta;
}

export function ProfilePage() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const {
    events,
    friends,
    appNotifications,
    toggleEventFavorite,
    nelDemoIsAdmin,
    setNelDemoIsAdmin,
    nelDemoIsPremium,
    setNelDemoIsPremium,
    adminReports,
    markAllAdminReportsRead,
    dismissAdminReport,
    moderationHideAndNotifyFromReport,
    viewerProfileAvatarUrl,
    setViewerProfileAvatarUrl,
    viewerProfileDisplayName,
    setViewerProfileDisplayName,
  } = useMessagingStore();
  const { openDetail } = useNavigationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileTabsRef = useRef<HTMLDivElement>(null);
  const profileTabStripViewportTopRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("favorites");

  const selectProfileTab = useCallback(
    (next: TabId) => {
      if (next === activeTab) return;
      const strip = profileTabsRef.current;
      profileTabStripViewportTopRef.current = strip
        ? strip.getBoundingClientRect().top
        : null;
      if (next === "reports") {
        markAllAdminReportsRead();
      }
      setActiveTab(next);
    },
    [activeTab, markAllAdminReportsRead],
  );

  useLayoutEffect(() => {
    const wantStripTop = profileTabStripViewportTopRef.current;
    profileTabStripViewportTopRef.current = null;
    if (wantStripTop == null) return;

    const applyStripAnchor = () => {
      const strip = profileTabsRef.current;
      if (!strip) return;
      compensateScrollAfterTabStripLayout(strip, wantStripTop);
    };

    applyStripAnchor();
    // Le navigateur peut encore ajuster le scroll (scroll anchoring) après la peinture : 2e passage.
    let rafInner = 0;
    const rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(applyStripAnchor);
    });
    return () => {
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
    };
  }, [activeTab]);
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Mock user state (nom + photo partagés avec EventDetail / création de sortie)
  const [age, setAge] = useState("28");
  const [bio, setBio] = useState(
    "Passionné de rando et de sorties culturelles sur Paris ! 🏔️🎭",
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const unreadAdminReportsCount = useMemo(
    () => adminReports.filter((r) => !r.read).length,
    [adminReports],
  );

  /** Favoris + créées : uniquement à partir d’aujourd’hui (jour calendaire local). */
  const favoritesAndCreatedEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          (e.isFavorite || e.status === "organisateur") &&
          !isEventDateBeforeToday(e.dateKey),
      ),
    [events],
  );
  /** Passés : avant aujourd’hui parmi inscrit / organisateur / favori. */
  const historyEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          isEventDateBeforeToday(e.dateKey) &&
          (e.status === "inscrit" ||
            e.status === "organisateur" ||
            e.isFavorite),
      ),
    [events],
  );
  const upcomingEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          e.status === "inscrit" ||
          e.status === "organisateur" ||
          e.status === "en_attente",
      ),
    [events],
  );

  const sortedNotifications = useMemo(
    () => [...appNotifications].sort((a, b) => b.createdAt - a.createdAt),
    [appNotifications],
  );

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file || !file.type.startsWith("image/")) {
      input.value = "";
      return;
    }

    setUploadingPhoto(true);
    try {
      const userKey = getNelProfileImageKitUserKey();
      const url = await uploadLocalImageToImageKit({
        webFile: file,
        mimeType: file.type || null,
        userKey,
      });
      setViewerProfileAvatarUrl(withUrlUploadVersion(url));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      window.alert(`${t("photoUploadFailed")}: ${msg}`);
    } finally {
      setUploadingPhoto(false);
      input.value = "";
    }
  };

  const badges = [
    { id: "punctual", label: "Ponctuel", icon: Award },
    { id: "organizer", label: "Organisateur", icon: Award },
    { id: "friendly", label: "Amical", icon: Award },
    { id: "explorer", label: "Explorateur", icon: Award },
  ];

  return (
    <div className="profile-page">
      {/* Hero Section */}
      <div className="profile-hero">
        <img src={viewerProfileAvatarUrl} alt="Profile" className="hero-img" />
        <div className="hero-overlay" />

        {uploadingPhoto ? (
          <div
            className="hero-upload-loader"
            role="status"
            aria-live="polite"
            aria-label={t("photoUploading")}
          >
            <Loader2
              className="hero-upload-spinner"
              size={40}
              color="#fff"
              strokeWidth={2.2}
              aria-hidden
            />
            <p className="hero-upload-loader-text">{t("photoUploading")}</p>
          </div>
        ) : null}

        <div className="hero-top-btns">
          <button
            type="button"
            className="hero-icon-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label={t("settingsAriaLabel")}
          >
            <Settings size={22} color="#fff" />
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="hero-icon-btn"
            onClick={handlePhotoClick}
            disabled={uploadingPhoto}
            aria-label={t("changePhoto")}
            aria-busy={uploadingPhoto}
          >
            <Camera size={22} color="#fff" />
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
          accept="image/*"
        />

        <div className="hero-bottom-info">
          {!editing ? (
            <h1 className="hero-name">
              {viewerProfileDisplayName}
              {age ? `, ${age}` : ""}
            </h1>
          ) : (
            <div className="hero-edit-fields">
              <input
                value={viewerProfileDisplayName}
                onChange={(e) => setViewerProfileDisplayName(e.target.value)}
                placeholder={t("name")}
                className="hero-input"
              />
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t("age")}
                className="hero-input hero-input--small"
              />
            </div>
          )}
          <div className="verified-badge">
            <ShieldCheck size={16} color="#22C55E" />
            <span>{t("verified")}</span>
          </div>
        </div>
      </div>

      <div className="profile-content">
        {/* Bio Card */}
        <div className="bio-card">
          {!editing ? (
            <p className="bio-text">{bio || "—"}</p>
          ) : (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("bio")}
              className="bio-textarea"
            />
          )}
          <div className="bio-divider" />
          <div className="member-since">
            <Calendar size={16} color="#8E8E93" />
            <span>{t("memberSince")}</span>
          </div>
          <div className="bio-actions">
            {!editing ? (
              <button
                type="button"
                className="edit-btn"
                onClick={() => setEditing(true)}
              >
                <Pencil size={16} color="#FBBF24" />
                <span>{t("editProfile")}</span>
              </button>
            ) : (
              <div className="edit-save-cancel">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setEditing(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className="save-btn"
                  onClick={() => setEditing(false)}
                >
                  {t("save")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="section-title">{t("badges")}</div>
        <div className="badges-grid">
          {badges.map((b) => (
            <div key={b.id} className="badge-chip">
              <span>{b.label}</span>
            </div>
          ))}
          <div className="badge-chip badge-chip--add">
            <Plus size={14} />
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-num" style={{ color: "#FBBF24" }}>
              4.8
            </span>
            <span className="stat-label">{t("reliability")}</span>
          </div>
          <div className="stat-item">
            <span className="stat-num" style={{ color: "#8B5CF6" }}>
              {upcomingEvents.length}
            </span>
            <span className="stat-label">{t("upcoming")}</span>
          </div>
          <div className="stat-item">
            <span className="stat-num" style={{ color: "#9CA3AF" }}>
              0
            </span>
            <span className="stat-label">{t("noShows")}</span>
          </div>
        </div>

        {/* Sub Tabs */}
        <div
          id="profile-tabs-anchor"
          className="profile-tabs"
          ref={profileTabsRef}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest("button.p-tab"))
              e.preventDefault();
          }}
        >
          <button
            type="button"
            className={`p-tab ${activeTab === "favorites" ? "p-tab--active" : ""}`}
            onClick={() => selectProfileTab("favorites")}
          >
            <div className="p-tab-inner">
              <Heart
                size={18}
                color={activeTab === "favorites" ? "#FF4B81" : "#8E8E93"}
              />
              <span>{t("favoritesCreated")}</span>
              <span className="p-tab-badge" style={{ background: "#FF4B81" }}>
                {favoritesAndCreatedEvents.length}
              </span>
            </div>
          </button>
          <button
            type="button"
            className={`p-tab ${activeTab === "friends" ? "p-tab--active" : ""}`}
            onClick={() => selectProfileTab("friends")}
          >
            <div className="p-tab-inner">
              <Users
                size={18}
                color={activeTab === "friends" ? "#8B5CF6" : "#8E8E93"}
              />
              <span>{t("friends")}</span>
              <span className="p-tab-badge" style={{ background: "#8B5CF6" }}>
                {friends.length}
              </span>
            </div>
          </button>
          {nelDemoIsAdmin && (
            <button
              type="button"
              className={`p-tab ${activeTab === "reports" ? "p-tab--active" : ""}`}
              onClick={() => selectProfileTab("reports")}
            >
              <div className="p-tab-inner">
                <AlertTriangle
                  size={18}
                  color={activeTab === "reports" ? "#EF4444" : "#8E8E93"}
                />
                <span>{t("reports")}</span>
                {unreadAdminReportsCount > 0 ? (
                  <span
                    className="p-tab-badge p-tab-badge--alert"
                    aria-label={`${unreadAdminReportsCount} ${t("unreadCount")}`}
                  >
                    {formatBadgeCount(unreadAdminReportsCount)}
                  </span>
                ) : null}
              </div>
            </button>
          )}
          <button
            type="button"
            className={`p-tab ${activeTab === "history" ? "p-tab--active" : ""}`}
            onClick={() => selectProfileTab("history")}
          >
            <div className="p-tab-inner">
              <Clock
                size={18}
                color={activeTab === "history" ? "#6B7280" : "#8E8E93"}
              />
              <span>{t("history")}</span>
              <span className="p-tab-badge" style={{ background: "#6B7280" }}>
                {historyEvents.length}
              </span>
            </div>
          </button>
          <button
            type="button"
            className={`p-tab ${activeTab === "notifications" ? "p-tab--active" : ""}`}
            onClick={() => selectProfileTab("notifications")}
          >
            <div className="p-tab-inner">
              <Bell
                size={18}
                color={activeTab === "notifications" ? "#5AC8FA" : "#8E8E93"}
              />
              <span>{t("notifications")}</span>
              <span className="p-tab-badge" style={{ background: "#5AC8FA" }}>
                {appNotifications.length}
              </span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-container">
          {activeTab === "favorites" && (
            <div className="favorites-list">
              {favoritesAndCreatedEvents.map((e) => (
                <div
                  key={e.id}
                  role="button"
                  tabIndex={0}
                  className="p-event-row"
                  aria-label={`${t("openEvent")} ${e.title}`}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => openDetail("event", e.id)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      openDetail("event", e.id);
                    }
                  }}
                >
                  <img src={e.imageUri} alt={e.title} className="p-event-img" />
                  <div className="p-event-info">
                    <div className="p-event-title">{e.title}</div>
                    <div className="p-event-meta">
                      {e.dateLabel} · {e.timeShort}
                      {e.status === "organisateur" ? (
                        <span className="p-event-meta-tag">
                          {" "}
                          · {t("youOrganize")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Heart
                    size={20}
                    fill={e.isFavorite ? "#FF4B81" : "transparent"}
                    color="#FF4B81"
                    onClick={(clickEv) => {
                      clickEv.stopPropagation();
                      toggleEventFavorite(e.id);
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </div>
              ))}
              {favoritesAndCreatedEvents.length === 0 && (
                <div className="empty-hint">{t("noFavoritesUpcoming")}</div>
              )}
            </div>
          )}

          {activeTab === "friends" && (
            <div className="friends-list">
              {friends.map((f) => (
                <div key={f.profilId} className="friend-card">
                  <img src={f.imageUrl} alt={f.name} className="friend-av" />
                  <div className="friend-info">
                    <div className="friend-name">{f.name}</div>
                    <div className="friend-sub">
                      {f.age} ans · {f.city} · {f.eventsInCommon} communs
                    </div>
                  </div>
                  <button
                    type="button"
                    className="view-btn"
                    onClick={() => openDetail("profile", f.profilId)}
                    aria-label={`${t("viewProfileOf")} ${f.name}`}
                  >
                    {t("view")}
                  </button>
                </div>
              ))}
              {friends.length === 0 && (
                <div className="empty-hint">{t("noFriends")}</div>
              )}
            </div>
          )}

          {activeTab === "reports" && (
            <div className="reports-list">
              {adminReports.map((r) => {
                const when = new Date(r.createdAt).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short",
                });
                return (
                  <div key={r.id} className="admin-report-card">
                    <button
                      type="button"
                      className="admin-report-main"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() =>
                        r.kind === "profile"
                          ? openDetail("profile", r.subjectId)
                          : openDetail("event", r.subjectId)
                      }
                    >
                      <div className="admin-report-icon" aria-hidden>
                        <AlertTriangle size={22} color="#FFCC00" />
                      </div>
                      <div className="admin-report-texts">
                        <div className="admin-report-title-row">
                          <span className="admin-report-kind">
                            {r.kind === "profile" ? t("profile") : t("event")}
                          </span>
                        </div>
                        <div className="admin-report-subject">
                          {r.subjectLabel}
                        </div>
                        <div className="admin-report-body">{r.explanation}</div>
                        <div className="admin-report-meta">{when}</div>
                      </div>
                    </button>
                    <div className="admin-report-actions">
                      <button
                        type="button"
                        className="admin-report-btn admin-report-btn--ghost"
                        onClick={() => dismissAdminReport(r.id)}
                      >
                        {t("dismiss")}
                      </button>
                      <button
                        type="button"
                        className="admin-report-btn admin-report-btn--primary"
                        onClick={() => moderationHideAndNotifyFromReport(r.id)}
                      >
                        {t("hideAndNotify")}
                      </button>
                    </div>
                  </div>
                );
              })}
              {adminReports.length === 0 ? (
                <div className="empty-hint">{t("noReports")}</div>
              ) : null}
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="notifications-list">
              {sortedNotifications.map((n) => {
                const inviteeAv =
                  friends.find((f) => f.profilId === n.inviteeProfilId)
                    ?.imageUrl ?? "";
                const when = new Date(n.createdAt).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short",
                });
                return (
                  <button
                    key={n.id}
                    type="button"
                    className="notification-card"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => openDetail("event", n.eventId)}
                  >
                    {inviteeAv ? (
                      <img src={inviteeAv} alt="" className="notification-av" />
                    ) : (
                      <div
                        className="notification-av notification-av--placeholder"
                        aria-hidden
                      >
                        <Bell size={22} color="#8E8E93" />
                      </div>
                    )}
                    <div className="notification-texts">
                      <div className="notification-title">
                        {t("invitationSent")}
                      </div>
                      <div className="notification-body">
                        {n.inviteeName} {t("willNotify")} « {n.eventTitle} ».
                      </div>
                      <div className="notification-meta">{when}</div>
                    </div>
                  </button>
                );
              })}
              {sortedNotifications.length === 0 && (
                <div className="empty-hint">{t("noNotifications")}</div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="history-list">
              {historyEvents.map((e) => (
                <div
                  key={e.id}
                  role="button"
                  tabIndex={0}
                  className="p-event-row"
                  aria-label={`Ouvrir la sortie ${e.title}`}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => openDetail("event", e.id)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      openDetail("event", e.id);
                    }
                  }}
                >
                  <img src={e.imageUri} alt={e.title} className="p-event-img" />
                  <div className="p-event-info">
                    <div className="p-event-title">{e.title}</div>
                    <div className="p-event-meta">
                      {e.dateLabel} · {e.timeShort}
                    </div>
                  </div>
                </div>
              ))}
              {historyEvents.length === 0 && (
                <div className="empty-hint">{t("noPastActivity")}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{t("settings")}</h3>
              <button type="button" onClick={() => setSettingsOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="setting-section">
                <div className="setting-item">
                  <div className="setting-icon gold">
                    <Crown size={20} />
                  </div>
                  <div className="setting-text">
                    <div className="setting-label">{t("premium")}</div>
                    <div className="setting-sub">{t("premiumSub")}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={nelDemoIsPremium}
                    onChange={(e) => setNelDemoIsPremium(e.target.checked)}
                    className="switch"
                  />
                </div>
                <div className="setting-item">
                  <div className="setting-icon pink">
                    <Shield size={20} color="#fff" />
                  </div>
                  <div className="setting-text">
                    <div className="setting-label">{t("adminMode")}</div>
                    <div className="setting-sub">{t("adminModeSub")}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={nelDemoIsAdmin}
                    onChange={(e) => setNelDemoIsAdmin(e.target.checked)}
                    className="switch"
                  />
                </div>
                <div className="setting-item">
                  <div className="setting-icon blue">
                    <Globe size={20} />
                  </div>
                  <div className="setting-text">
                    <div className="setting-label">{t("language")}</div>
                    <div className="setting-sub">
                      {language === "fr" ? "Français" : "English"}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={language === "en"}
                    onChange={(e) =>
                      setLanguage(e.target.checked ? "en" : "fr")
                    }
                    className="switch"
                    aria-label="Toggle language"
                  />
                </div>
              </div>

              <div className="setting-section">
                <button className="setting-btn">
                  <FlaskConical size={20} />
                  <span>{t("betaFeatures")}</span>
                </button>
              </div>

              <div className="setting-section">
                <button className="setting-btn danger">
                  <LogOut size={20} />
                  <span>{t("logout")}</span>
                </button>
                <button className="setting-btn danger">
                  <Trash2 size={20} />
                  <span>{t("deleteAccount")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
