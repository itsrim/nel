import { Filter, Heart, X, Clock, Users, List } from 'lucide-react';
import { useState, useMemo } from 'react';
import './HomePage.css';

interface Event {
  id: number;
  title: string;
  location: string;
  time: string;
  date: string;
  price: string;
  rating: string;
  image: string;
  lat: number;
  lng: number;
}

interface Cluster {
  lat: number;
  lng: number;
  events: Event[];
  count: number;
}

const events: Event[] = [
  {
    id: 1,
    title: 'Concert Jazz',
    location: 'Centre-ville',
    time: '20:00',
    date: '15 mars',
    price: '25€',
    rating: '★ 4.8 (124)',
    image: 'jazz',
    lat: 43.6047,
    lng: 1.4442,
  },
  {
    id: 2,
    title: 'Festival de Musique',
    location: 'Capitole',
    time: '18:00',
    date: '16 mars',
    price: '30€',
    rating: '★ 4.9 (89)',
    image: 'festival',
    lat: 43.6045,
    lng: 1.4440,
  },
  {
    id: 3,
    title: 'Exposition Art',
    location: 'Musée',
    time: '14:00',
    date: '17 mars',
    price: '15€',
    rating: '★ 4.7 (56)',
    image: 'art',
    lat: 43.6050,
    lng: 1.4445,
  },
  {
    id: 4,
    title: 'Théâtre',
    location: 'Théâtre du Capitole',
    time: '19:30',
    date: '18 mars',
    price: '35€',
    rating: '★ 4.9 (203)',
    image: 'theatre',
    lat: 43.6043,
    lng: 1.4438,
  },
  {
    id: 5,
    title: 'Concert Rock',
    location: 'Zénith',
    time: '21:00',
    date: '19 mars',
    price: '40€',
    rating: '★ 4.6 (78)',
    image: 'rock',
    lat: 43.6060,
    lng: 1.4450,
  },
];

// Distance de clustering en degrés (environ 200m)
const CLUSTER_DISTANCE = 0.002;

// Fonction pour calculer la distance entre deux points en degrés
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// Fonction de clustering
function clusterEvents(events: Event[]): Cluster[] {
  const clusters: Cluster[] = [];
  const processed = new Set<number>();

  events.forEach((event) => {
    if (processed.has(event.id)) return;

    const cluster: Cluster = {
      lat: event.lat,
      lng: event.lng,
      events: [event],
      count: 1,
    };
    processed.add(event.id);

    // Chercher les événements proches
    events.forEach((otherEvent) => {
      if (processed.has(otherEvent.id)) return;
      
      const distance = getDistance(event.lat, event.lng, otherEvent.lat, otherEvent.lng);
      if (distance < CLUSTER_DISTANCE) {
        cluster.events.push(otherEvent);
        cluster.count++;
        processed.add(otherEvent.id);
        
        // Recalculer le centre du cluster
        cluster.lat = cluster.events.reduce((sum, e) => sum + e.lat, 0) / cluster.events.length;
        cluster.lng = cluster.events.reduce((sum, e) => sum + e.lng, 0) / cluster.events.length;
      }
    });

    clusters.push(cluster);
  });

  return clusters;
}

export function HomePage() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [clusterEventIndex, setClusterEventIndex] = useState(0);
  const [scrollCollapsed, setScrollCollapsed] = useState(false);

  // Calculer les clusters
  const clusters = useMemo(() => clusterEvents(events), []);

  const handleClusterClick = (cluster: Cluster) => {
    setScrollCollapsed(true);
    if (cluster.count === 1) {
      setSelectedEvent(cluster.events[0]);
      setSelectedCluster(null);
    } else {
      // Si plusieurs événements, afficher le cluster avec scroll vertical
      setSelectedCluster(cluster);
      setSelectedEvent(cluster.events[0]);
      setClusterEventIndex(0);
    }
  };

  const handleEventCardClick = (event: Event) => {
    setScrollCollapsed(true);
    setSelectedEvent(event);
    setSelectedCluster(null);
    // Trouver le cluster correspondant
    const cluster = clusters.find(c => c.events.some(e => e.id === event.id));
    if (cluster && cluster.count > 1) {
      setSelectedCluster(cluster);
      setClusterEventIndex(cluster.events.findIndex(e => e.id === event.id));
    }
  };

  const handleCloseInfo = () => {
    setSelectedEvent(null);
    setSelectedCluster(null);
    setClusterEventIndex(0);
    setScrollCollapsed(false);
  };

  const handleNextClusterEvent = () => {
    if (selectedCluster && clusterEventIndex < selectedCluster.events.length - 1) {
      const nextIndex = clusterEventIndex + 1;
      setClusterEventIndex(nextIndex);
      setSelectedEvent(selectedCluster.events[nextIndex]);
    }
  };

  const handlePrevClusterEvent = () => {
    if (selectedCluster && clusterEventIndex > 0) {
      const prevIndex = clusterEventIndex - 1;
      setClusterEventIndex(prevIndex);
      setSelectedEvent(selectedCluster.events[prevIndex]);
    }
  };

  // Convertir les coordonnées en pourcentage pour le positionnement
  const getMarkerPosition = (lat: number, lng: number) => {
    const centerLat = 43.6047;
    const centerLng = 1.4442;
    const latRange = 0.01; // Plage de latitude visible
    const lngRange = 0.01; // Plage de longitude visible
    
    const left = 50 + ((lng - centerLng) / lngRange) * 40;
    const top = 50 + ((centerLat - lat) / latRange) * 40;
    
    return { left: `${left}%`, top: `${top}%` };
  };

  return (
    <div className="home-page">
      {/* Map Container */}
      <div className="map-container">
        {/* Header - Overlay on map */}
        <header className="map-header">
          <div className="search-bar-header">
            <div className="search-bar-content">
              <span className="search-location">Toulouse · Événements</span>
              <span className="search-dates">13-15 mars · 2 personnes</span>
            </div>
          </div>
          <button className="filter-button-header" aria-label="Filter">
            <Filter size={20} />
          </button>
        </header>
        <div className="map-placeholder">
          <iframe
            className="map-iframe"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${1.4442 - 0.015},${43.6047 - 0.015},${1.4442 + 0.015},${43.6047 + 0.015}&layer=mapnik`}
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            allowFullScreen
          />
          <div 
            className="map-click-area" 
            onClick={() => setScrollCollapsed(true)}
          />
          <div className="map-overlay">
            <div className="map-content">
              {clusters.map((cluster, index) => {
                const position = getMarkerPosition(cluster.lat, cluster.lng);
                const isSelected = selectedEvent && cluster.events.some(e => e.id === selectedEvent.id);
                return (
                  <div
                    key={index}
                    className={`event-marker ${isSelected ? 'selected' : ''} ${cluster.count > 1 ? 'cluster' : ''}`}
                    style={position}
                    onClick={() => handleClusterClick(cluster)}
                  >
                    <span className="marker-count">{cluster.count > 1 ? cluster.count : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Event Detail Card */}
        {selectedEvent && (
          <div className="event-detail-card">
            <button className="close-button" onClick={handleCloseInfo} aria-label="Close">
              <X size={18} />
            </button>
            {selectedCluster && selectedCluster.count > 1 && (
              <div className="cluster-navigation">
                <button 
                  className="cluster-nav-button prev" 
                  onClick={handlePrevClusterEvent}
                  disabled={clusterEventIndex === 0}
                  aria-label="Previous"
                >
                  ←
                </button>
                <span className="cluster-counter">
                  {clusterEventIndex + 1} / {selectedCluster.count}
                </span>
                <button 
                  className="cluster-nav-button next" 
                  onClick={handleNextClusterEvent}
                  disabled={clusterEventIndex === selectedCluster.events.length - 1}
                  aria-label="Next"
                >
                  →
                </button>
              </div>
            )}
            <div className={`event-image-detail ${selectedEvent.image}`}></div>
            <div className="event-detail-content">
              <div className="event-detail-header">
                <h3 className="event-detail-title">{selectedEvent.title}</h3>
                <div className="event-detail-price">{selectedEvent.price}</div>
              </div>
              <p className="event-detail-subtitle">{selectedEvent.location} · {selectedEvent.time} · {selectedEvent.date}</p>
              <div className="event-detail-info">
                <div className="detail-info-item">
                  <Users size={14} />
                  <span>{selectedEvent.rating}</span>
                </div>
              </div>
              <div className="event-detail-actions">
                <button className="action-button secondary">Plus tard</button>
                <button className="action-button primary">Participer</button>
              </div>
            </div>
            <button className="favorite-button-detail" aria-label="Favorite">
              <Heart size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Toggle List Button */}
      {scrollCollapsed && (
        <button 
          className="toggle-list-button"
          onClick={() => setScrollCollapsed(false)}
          aria-label="Afficher la liste"
        >
          <List size={20} />
        </button>
      )}

      {/* Events Horizontal Scroll */}
      <div className={`events-horizontal-container ${scrollCollapsed ? 'collapsed' : ''}`}>
        <div className="events-horizontal-scroll">
          {events.map((event) => (
            <div
              key={event.id}
              className={`event-card ${selectedEvent?.id === event.id ? 'selected' : ''}`}
              onClick={() => handleEventCardClick(event)}
            >
              <div className={`event-card-image ${event.image}`}></div>
              <div className="event-card-content">
                <div className="event-card-header">
                  <h3 className="event-card-title">{event.title}</h3>
                  <div className="event-card-price">{event.price}</div>
                </div>
                <div className="event-card-meta">
                  <Clock size={12} />
                  <span>{event.time} · {event.date}</span>
                  <Users size={12} />
                  <span>{event.location}</span>
                  <span className="event-card-rating">{event.rating}</span>
                </div>
              </div>
              <button className="event-card-favorite" aria-label="Favorite">
                <Heart size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
