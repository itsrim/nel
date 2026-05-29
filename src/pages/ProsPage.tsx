import { useMemo, useState } from "react";
import { LayoutGrid, Map, MapPin, Search, ShieldCheck } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import {
  MOCK_PROFESSIONALS,
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

function ProListCard({ pro }: { pro: MockProfessional }) {
  return (
    <article className="pros-card">
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
    </article>
  );
}

export function ProsPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ProsViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProCategory | "all">("all");
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return MOCK_PROFESSIONALS.filter((pro) => {
      if (categoryFilter !== "all" && pro.category !== categoryFilter) return false;
      return matchesSearch(pro, searchQuery);
    });
  }, [categoryFilter, searchQuery]);

  const selectedMapPro =
    filtered.find((p) => p.id === selectedMapId) ?? filtered[0] ?? null;

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
              <ProListCard key={pro.id} pro={pro} />
            ))}
          </div>
        ) : (
          <div className="pros-map-wrap">
            {filtered.map((pro) => (
              <button
                key={pro.id}
                type="button"
                className={`pros-map-pin${selectedMapPro?.id === pro.id ? " pros-map-pin--selected" : ""}`}
                style={{ left: `${pro.mapX}%`, top: `${pro.mapY}%` }}
                aria-label={proFullName(pro)}
                onClick={() => setSelectedMapId(pro.id)}
              >
                <span className="pros-map-pin-label">{pro.firstName}</span>
                <span className="pros-map-pin-dot" />
              </button>
            ))}
            {selectedMapPro ? (
              <div className="pros-map-card">
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
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
