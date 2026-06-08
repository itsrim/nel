import { useMemo, useState, useEffect } from "react";
import { LayoutGrid, Map, MapPin, Search, ShieldCheck } from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useProsStore } from "../store/useProsStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { useTranslation } from "../i18n/useTranslation";
import { ProsMapView } from "../components/ProsMapView";
import { mapCenterForCity } from "../lib/proCoordinates";
import { buildViewerProfessional, VIEWER_PRO_ID } from "../lib/proLocation";
import {
  PRO_CATEGORY_OPTIONS,
  proFullName,
  proSearchHaystack,
  type MockProfessional,
  type ProCategory,
} from "../data/mockProfessionals";
import "./ProsPage.css";

type ProsViewMode = "list" | "map";

function foldSearch(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function matchesSearch(pro: MockProfessional, query: string): boolean {
  const q = foldSearch(query.trim());
  if (!q) return true;
  return foldSearch(proSearchHaystack(pro)).includes(q);
}

function ProListCard({
  pro,
  onOpen,
}: {
  pro: MockProfessional;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className="pros-card"
      onClick={() => onOpen(pro.id)}
      aria-label={proFullName(pro)}
    >
      <div className="pros-card-img-wrap">
        <img src={pro.imageUrl} alt="" className="pros-card-img" />
        <span className="pros-card-badge">{pro.categoryLabel}</span>
        {pro.verified ? (
          <span className="pros-card-verified" aria-label="Vérifié">
            <ShieldCheck size={14} aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="pros-card-body">
        <h3 className="pros-card-name">{proFullName(pro)}</h3>
        <p className="pros-card-city">
          <MapPin size={11} aria-hidden />
          {pro.city}
        </p>
        <p className="pros-card-desc">{pro.description}</p>
      </div>
    </button>
  );
}

export function ProsPage() {
  const { t } = useTranslation();
  const { openDetail } = useNavigationStore();
  const professionals = useProsStore((s) => s.professionals);
  const {
    viewerProfileCity,
    viewerProfileIsPro,
    viewerProfileDisplayName,
    viewerProfileAvatarUrl,
    viewerProAddress,
    viewerProLat,
    viewerProLng,
    viewerProWebsiteUrl,
    viewerProSocialUrl,
    viewerProPhone,
  } = useMessagingStore();
  const mapCenter = useMemo(
    () => mapCenterForCity(viewerProfileCity),
    [viewerProfileCity],
  );
  const [viewMode, setViewMode] = useState<ProsViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProCategory | "all">("all");
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const professionalsWithViewer = useMemo(() => {
    const viewerPro = viewerProfileIsPro
      ? buildViewerProfessional({
          displayName: viewerProfileDisplayName,
          avatarUrl: viewerProfileAvatarUrl,
          city: viewerProfileCity,
          address: viewerProAddress,
          lat: viewerProLat,
          lng: viewerProLng,
          websiteUrl: viewerProWebsiteUrl,
          socialUrl: viewerProSocialUrl,
          phone: viewerProPhone,
        })
      : null;
    if (!viewerPro) return professionals;
    return [
      viewerPro,
      ...professionals.filter((p) => p.id !== VIEWER_PRO_ID),
    ];
  }, [
    professionals,
    viewerProfileIsPro,
    viewerProfileDisplayName,
    viewerProfileAvatarUrl,
    viewerProfileCity,
    viewerProAddress,
    viewerProLat,
    viewerProLng,
    viewerProWebsiteUrl,
    viewerProSocialUrl,
    viewerProPhone,
  ]);

  const filtered = useMemo(() => {
    return professionalsWithViewer.filter((pro) => {
      if (categoryFilter !== "all" && pro.category !== categoryFilter) return false;
      return matchesSearch(pro, searchQuery);
    });
  }, [professionalsWithViewer, categoryFilter, searchQuery]);

  const selectedMapPro = selectedMapId
    ? (filtered.find((p) => p.id === selectedMapId) ?? null)
    : null;

  useEffect(() => {
    if (selectedMapId && !filtered.some((p) => p.id === selectedMapId)) {
      setSelectedMapId(null);
    }
  }, [filtered, selectedMapId]);

  const openProProfile = (id: string) => openDetail("pro", id);

  return (
    <div className="pros-page">
      <header className="pros-header">
        <div className="pros-header-row">
          <h1 className="pros-title">{t("professionalsTitle")}</h1>
          <div className="pros-view-toggle" role="group" aria-label={t("proViewModeLabel")}>
            <button
              type="button"
              className={`pros-view-btn${viewMode === "list" ? " pros-view-btn--active" : ""}`}
              aria-pressed={viewMode === "list"}
              aria-label={t("proViewList")}
              onClick={() => setViewMode("list")}
            >
              <LayoutGrid size={18} aria-hidden />
            </button>
            <button
              type="button"
              className={`pros-view-btn${viewMode === "map" ? " pros-view-btn--active" : ""}`}
              aria-pressed={viewMode === "map"}
              aria-label={t("proViewMap")}
              onClick={() => setViewMode("map")}
            >
              <Map size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div className="pros-search-wrap">
          <Search size={18} className="pros-search-icon" aria-hidden />
          <input
            type="search"
            className="pros-search-input"
            placeholder={t("proSearchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t("proSearchPlaceholder")}
          />
        </div>

        <div className="pros-filters" role="listbox" aria-label={t("proFilterLabel")}>
          <button
            type="button"
            role="option"
            aria-selected={categoryFilter === "all"}
            className={`pros-filter-chip${categoryFilter === "all" ? " pros-filter-chip--active" : ""}`}
            onClick={() => setCategoryFilter("all")}
          >
            {t("proFilterAll")}
          </button>
          {PRO_CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={categoryFilter === opt.id}
              className={`pros-filter-chip${categoryFilter === opt.id ? " pros-filter-chip--active" : ""}`}
              onClick={() => setCategoryFilter(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      <div className="pros-body">
        {filtered.length === 0 ? (
          <p className="pros-empty">{t("proNoResults")}</p>
        ) : viewMode === "list" ? (
          <div className="pros-grid">
            {filtered.map((pro) => (
              <ProListCard key={pro.id} pro={pro} onOpen={openProProfile} />
            ))}
          </div>
        ) : (
          <>
            <div className="pros-map-wrap">
              <ProsMapView
                professionals={filtered}
                selectedId={selectedMapId}
                mapCenter={mapCenter}
                onSelect={setSelectedMapId}
                onDeselect={() => setSelectedMapId(null)}
              />
            </div>
            {selectedMapPro ? (
              <button
                type="button"
                className="pros-map-card pros-map-card--floating pros-map-card--clickable"
                onClick={(e) => {
                  e.stopPropagation();
                  openProProfile(selectedMapPro.id);
                }}
                aria-label={proFullName(selectedMapPro)}
              >
                <img
                  src={selectedMapPro.imageUrl}
                  alt=""
                  className="pros-map-card-img"
                />
                <div className="pros-map-card-text">
                  <h3 className="pros-map-card-name">{proFullName(selectedMapPro)}</h3>
                  <p className="pros-map-card-meta">
                    {selectedMapPro.categoryLabel} · {selectedMapPro.city}
                  </p>
                  <p className="pros-map-card-desc">{selectedMapPro.description}</p>
                </div>
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
