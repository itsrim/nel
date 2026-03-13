import { ArrowLeft, Filter, Heart, X, MapPin, Clock, Users } from 'lucide-react';
import { useState } from 'react';
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

export function HomePage() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isListExpanded, setIsListExpanded] = useState(true);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsListExpanded(false);
  };

  const handleCloseInfo = () => {
    setSelectedEvent(null);
    setIsListExpanded(true);
  };

  return (
    <div className="home-page">
      {/* Header */}
      <header className="map-header">
        <button className="back-button" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
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

      {/* Map Container */}
      <div className={`map-container ${!isListExpanded ? 'map-expanded' : ''}`}>
        <div className="map-placeholder">
          <div className="map-content">
            <div className="city-label">Toulouse</div>
            {events.map((event) => (
              <div
                key={event.id}
                className={`event-marker ${selectedEvent?.id === event.id ? 'selected' : ''}`}
                style={{
                  left: `${30 + (event.lng - 1.4440) * 1000}%`,
                  top: `${50 + (event.lat - 43.6047) * 1000}%`,
                }}
                onClick={() => handleEventClick(event)}
              >
                <span className="marker-count">{events.filter(e => 
                  Math.abs(e.lat - event.lat) < 0.001 && 
                  Math.abs(e.lng - event.lng) < 0.001
                ).length}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Event Info Bubble */}
        {selectedEvent && (
          <div className="event-info-bubble">
            <button className="close-button" onClick={handleCloseInfo} aria-label="Close">
              <X size={18} />
            </button>
            <div className={`event-image-bubble ${selectedEvent.image}`}></div>
            <div className="event-info-content">
              <h3 className="event-info-title">{selectedEvent.title}</h3>
              <p className="event-info-subtitle">{selectedEvent.location}</p>
              <div className="event-info-details">
                <div className="info-detail-item">
                  <Clock size={14} />
                  <span>{selectedEvent.time} · {selectedEvent.date}</span>
                </div>
                <div className="info-detail-item">
                  <Users size={14} />
                  <span>{selectedEvent.rating}</span>
                </div>
              </div>
              <div className="event-info-price">{selectedEvent.price} au total</div>
            </div>
            <button className="favorite-button-bubble" aria-label="Favorite">
              <Heart size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Events List */}
      <div className={`events-list-container ${isListExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="list-drag-handle" onClick={() => setIsListExpanded(!isListExpanded)}>
          <div className="drag-indicator"></div>
        </div>
        <div className="events-list-header">
          <h2 className="list-title">Toulouse : Plus de {events.length} événements</h2>
          <p className="list-subtitle">
            Classement des résultats
            <span className="info-icon">ℹ</span>
          </p>
        </div>
        <div className="events-list">
          {events.map((event) => (
            <div
              key={event.id}
              className={`event-list-item ${selectedEvent?.id === event.id ? 'selected' : ''}`}
              onClick={() => handleEventClick(event)}
            >
              <div className={`event-list-image ${event.image}`}></div>
              <div className="event-list-content">
                <h3 className="event-list-title">{event.title}</h3>
                <p className="event-list-subtitle">{event.location}</p>
                <div className="event-list-details">
                  <span className="event-list-time">{event.time} · {event.date}</span>
                  <span className="event-list-rating">{event.rating}</span>
                </div>
                <div className="event-list-price">{event.price} au total</div>
              </div>
              <button className="event-list-favorite" aria-label="Favorite">
                <Heart size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
