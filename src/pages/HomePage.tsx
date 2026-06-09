import { useState, useMemo, useCallback } from "react";
import { Search, SlidersHorizontal, X, Check } from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { useTranslation } from "../i18n/useTranslation";
import { EventCard } from "../components/EventCard";
import { formatEventSectionTitle } from "../lib/eventDateKey";
import { eventIsVisibleInDiscovery } from "../lib/eventVisibility";
import "./HomePage.css";

export function HomePage() {
  const { openDetail } = useNavigationStore();
  const {
    events,
    nelDemoIsAdmin,
    moderationHiddenEventIds,
    viewerProfileDisplayName,
  } = useMessagingStore();
  const { t } = useTranslation();
  const [searchDraft, setSearchDraft] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  // Mock tags matching meetabit
  const tags = [
    { id: "1", label: t("all") },
    { id: "2", label: t("sport") },
    { id: "3", label: t("outings") },
    { id: "4", label: t("culture") },
    { id: "5", label: t("culture") }, // Détente placeholder
  ];

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (
        !eventIsVisibleInDiscovery(
          e,
          nelDemoIsAdmin,
          moderationHiddenEventIds,
          viewerProfileDisplayName,
        )
      )
        return false;
      const matchesSearch =
        e.title.toLowerCase().includes(committedSearch.toLowerCase()) ||
        e.location.toLowerCase().includes(committedSearch.toLowerCase());
      // For now, tags are mock filtering
      const matchesTag = !selectedTagId || selectedTagId === "1" || true;
      return matchesSearch && matchesTag;
    });
  }, [
    events,
    committedSearch,
    selectedTagId,
    nelDemoIsAdmin,
    moderationHiddenEventIds,
    viewerProfileDisplayName,
  ]);

  const topEvents = useMemo(() => {
    return [...filteredEvents]
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, 5);
  }, [filteredEvents]);

  /** Un groupe par `dateKey`, titre affiché harmonisé (évite doublons mock vs création). */
  const groupedEvents = useMemo(() => {
    const groups: Record<string, typeof events> = {};
    filteredEvents.forEach((e) => {
      if (!groups[e.dateKey]) groups[e.dateKey] = [];
      groups[e.dateKey].push(e);
    });
    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, items]) => ({
        dateKey,
        title: formatEventSectionTitle(dateKey),
        items,
      }));
  }, [filteredEvents]);

  const handleApplySearch = () => {
    setCommittedSearch(searchDraft);
  };

  const handleClearSearch = () => {
    setSearchDraft("");
    setCommittedSearch("");
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="search-row">
          <div className="search-bar">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder={t("searchActivity")}
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplySearch()}
            />
            {searchDraft && (
              <button className="clear-btn" onClick={handleClearSearch}>
                <X size={18} />
              </button>
            )}
            <button className="submit-btn" onClick={handleApplySearch}>
              <Check size={20} />
            </button>
          </div>
          <button className="filter-btn">
            <SlidersHorizontal size={22} />
          </button>
        </div>

        <div className="tags-scroll">
          {tags.map((tag) => (
            <button
              key={tag.id}
              className={`tag-pill ${selectedTagId === tag.id ? "active" : ""}`}
              onClick={() =>
                setSelectedTagId(tag.id === selectedTagId ? null : tag.id)
              }
            >
              {tag.label}
            </button>
          ))}
        </div>

        {topEvents.length > 0 && (
          <div className="top-section">
            <h2 className="section-title">{t("topActivities")}</h2>
            <div className="top-scroll">
              {topEvents.map((e) => (
                <div key={e.id} className="top-card-wrapper">
                  <EventCard
                    item={e}
                    onToggleFavorite={() => {}}
                    onClick={() => openDetail("event", e.id)}
                    width={280}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="home-content">
        <h2 className="section-title main-agenda-title">
          {t("activitiesSchedule")}
        </h2>
        {groupedEvents.map(({ dateKey, title, items }) => (
          <section key={dateKey} className="agenda-group">
            <h3 className="group-date-title">{title}</h3>
            <div className="event-grid">
              {items.map((e) => (
                <div key={e.id} className="grid-event-wrapper">
                  <EventCard
                    item={e}
                    onToggleFavorite={() => {}}
                    onClick={() => openDetail("event", e.id)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

    </div>
  );
}
