import { useState, useMemo, useCallback } from 'react';
import { Search, SlidersHorizontal, X, Check } from 'lucide-react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useMessagingStore } from '../store/useMessagingStore';
import { EventCard } from '../components/EventCard';
import { QuestionnaireModal } from '../components/QuestionnaireModal';
import { formatEventSectionTitle } from '../lib/eventDateKey';
import { eventIsVisibleInDiscovery } from '../lib/eventVisibility';
import './HomePage.css';

export function HomePage() {
  const { openDetail } = useNavigationStore();
  const { events, nelDemoIsAdmin, moderationHiddenEventIds } = useMessagingStore();
  const [searchDraft, setSearchDraft] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(true); // Open on first load matching meetabit

  // Mock tags matching meetabit
  const tags = [
    { id: '1', label: 'Tout' },
    { id: '2', label: 'Sport' },
    { id: '3', label: 'Sorties' },
    { id: '4', label: 'Culture' },
    { id: '5', label: 'Détente' },
  ];

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (!eventIsVisibleInDiscovery(e, nelDemoIsAdmin, moderationHiddenEventIds)) return false;
      const matchesSearch = e.title.toLowerCase().includes(committedSearch.toLowerCase()) || 
                             e.location.toLowerCase().includes(committedSearch.toLowerCase());
      // For now, tags are mock filtering
      const matchesTag = !selectedTagId || selectedTagId === '1' || true; 
      return matchesSearch && matchesTag;
    });
  }, [events, committedSearch, selectedTagId, nelDemoIsAdmin, moderationHiddenEventIds]);

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
    setSearchDraft('');
    setCommittedSearch('');
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="search-row">
          <div className="search-bar">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher une activité…"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
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
          {tags.map(tag => (
            <button
              key={tag.id}
              className={`tag-pill ${selectedTagId === tag.id ? 'active' : ''}`}
              onClick={() => setSelectedTagId(tag.id === selectedTagId ? null : tag.id)}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {topEvents.length > 0 && (
          <div className="top-section">
            <h2 className="section-title">Top 5 Activités</h2>
            <div className="top-scroll">
              {topEvents.map(e => (
                <div key={e.id} className="top-card-wrapper">
                  <EventCard 
                    item={e} 
                    onToggleFavorite={() => {}} 
                    onClick={() => openDetail('event', e.id)}
                    width={280} 
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="home-content">
        <h2 className="section-title main-agenda-title">Agenda des activités</h2>
        {groupedEvents.map(({ dateKey, title, items }) => (
          <section key={dateKey} className="agenda-group">
            <h3 className="group-date-title">{title}</h3>
            <div className="event-grid">
              {items.map(e => (
                <div key={e.id} className="grid-event-wrapper">
                  <EventCard 
                    item={e} 
                    onToggleFavorite={() => {}} 
                    onClick={() => openDetail('event', e.id)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Questionnaire Trigger Logic could go here or in App */}
      <QuestionnaireModal 
        isOpen={isQuestionnaireOpen} 
        onClose={() => setIsQuestionnaireOpen(false)} 
      />
    </div>
  );
}
