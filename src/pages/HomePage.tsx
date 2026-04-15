import { Filter, X, List, MapPin, Calendar, ChevronDown, Locate, Menu } from 'lucide-react';
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
    location: 'Centre-ville, Toulouse',
    time: '20:00',
    date: 'Jeu 10 Avr 2025',
    price: '25€',
    rating: '4.8',
    image: 'jazz',
    lat: 43.6047,
    lng: 1.4442,
  },
  {
    id: 2,
    title: 'Festival de Musique',
    location: 'Place du Capitole',
    time: '18:00',
    date: 'Ven 11 Avr 2025',
    price: '30€',
    rating: '4.9',
    image: 'festival',
    lat: 43.6045,
    lng: 1.4440,
  },
  {
    id: 3,
    title: 'Exposition Art',
    location: 'Musée des Abattoirs',
    time: '14:00',
    date: 'Sam 12 Avr 2025',
    price: '15€',
    rating: '4.7',
    image: 'art',
    lat: 43.6050,
    lng: 1.4445,
  },
  {
    id: 4,
    title: 'Théâtre',
    location: 'Théâtre du Capitole',
    time: '19:30',
    date: 'Dim 13 Avr 2025',
    price: '35€',
    rating: '4.9',
    image: 'theatre',
    lat: 43.6043,
    lng: 1.4438,
  },
  {
    id: 5,
    title: 'Concert Rock',
    location: 'Zénith, Toulouse',
    time: '21:00',
    date: 'Lun 14 Avr 2025',
    price: '40€',
    rating: '4.6',
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
        <header className="map-header home-map-header">
          <button type="button" className="home-location-pill" aria-label="Changer de lieu">
            <MapPin size={18} />
            <span className="home-location-text">Toulouse</span>
            <ChevronDown size={18} />
          </button>
          <div className="home-header-actions">
            <button type="button" className="home-header-icon-btn" aria-label="Ma position">
              <Locate size={20} />
            </button>
            <button type="button" className="home-header-icon-btn" aria-label="Filtres">
              <Filter size={20} />
            </button>
          </div>
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

        {/* Event Detail Card (style maquette: image gauche, infos droite, Next time / Going, pointeur) */}
        {selectedEvent && (
          <div className="event-detail-card event-detail-card-mock">
            <button type="button" className="close-button" onClick={(e) => { e.stopPropagation(); handleCloseInfo(); }} aria-label="Fermer">
              <X size={18} />
            </button>
            <div className="event-detail-card-top-actions">
              {selectedCluster && selectedCluster.count > 1 && (
                <div className="cluster-navigation">
                  <button
                    type="button"
                    className="cluster-nav-button prev"
                    onClick={(e) => { e.stopPropagation(); handlePrevClusterEvent(); }}
                    disabled={clusterEventIndex === 0}
                    aria-label="Précédent"
                  >
                    ←
                  </button>
                  <span className="cluster-counter">
                    {clusterEventIndex + 1} / {selectedCluster.count}
                  </span>
                  <button
                    type="button"
                    className="cluster-nav-button next"
                    onClick={(e) => { e.stopPropagation(); handleNextClusterEvent(); }}
                    disabled={clusterEventIndex === selectedCluster.events.length - 1}
                    aria-label="Suivant"
                  >
                    →
                  </button>
                </div>
              )}
              <button type="button" className="event-detail-menu-button" aria-label="Menu">
                <Menu size={20} />
              </button>
            </div>
            <div className="event-detail-card-inner">
              <div className={`event-detail-thumb ${selectedEvent.image}`} />
              <div className="event-detail-body">
                <h3 className="event-detail-title">{selectedEvent.title}</h3>
                <p className="event-detail-date">
                  <Calendar size={14} />
                  {selectedEvent.date}
                </p>
                <p className="event-detail-location">
                  <MapPin size={14} />
                  {selectedEvent.location}
                </p>
                <div className="event-detail-actions">
                  <button type="button" className="action-button secondary next-time">Next time</button>
                  <button type="button" className="action-button primary going">Going</button>
                </div>
              </div>
            </div>
            <div className="event-detail-pointer" aria-hidden />
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
              role="button"
              tabIndex={0}
              className={`event-card event-card-strip ${selectedEvent?.id === event.id ? 'selected' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleEventCardClick(event); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEventCardClick(event); } }}
            >
              <div className={`event-card-image ${event.image}`} aria-hidden />
              <div className="event-card-content">
                <h3 className="event-card-title">{event.title}</h3>
                <p className="event-card-location">
                  <MapPin size={14} />
                  {event.location}
                </p>
                <p className="event-card-rate">Rate <span className="event-card-rate-value">{event.rating}/5</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
