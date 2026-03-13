import { Search, Filter, Heart, Clock, MapPin, Check, Plus } from 'lucide-react';
import './TicketsPage.css';

interface Event {
  id: number;
  title: string;
  time: string;
  location: string;
  image: string;
  price: string;
  status: 'inscrit' | 'inscrire' | 'organisateur';
  participants: string;
  date: string;
}

const eventsByDate: Record<string, Event[]> = {
  '2025-01-15': [
    {
      id: 1,
      title: 'Atelier Cuisine Italienne',
      time: '08:00',
      location: 'Montmartre',
      image: 'cuisine',
      price: '57€',
      status: 'inscrit',
      participants: '22/20',
      date: '2025-01-15',
    },
    {
      id: 2,
      title: 'Visite Musée',
      time: '08:00',
      location: 'Café de Flore',
      image: 'musee',
      price: '17€',
      status: 'inscrit',
      participants: '31/150',
      date: '2025-01-15',
    },
    {
      id: 3,
      title: 'Cours de Guitare',
      time: '08:00',
      location: 'Saint-Germain',
      image: 'guitare',
      price: 'Gratuit',
      status: 'inscrire',
      participants: '15/200',
      date: '2025-01-15',
    },
  ],
  '2025-01-16': [
    {
      id: 4,
      title: 'Escape Game',
      time: '08:00',
      location: 'Station F',
      image: 'escape',
      price: '56€',
      status: 'inscrit',
      participants: '21/20',
      date: '2025-01-16',
    },
    {
      id: 5,
      title: 'Atelier Cocktails',
      time: '09:30',
      location: 'Le Marais',
      image: 'cocktails',
      price: '21€',
      status: 'inscrit',
      participants: '7/5',
      date: '2025-01-16',
    },
  ],
  '2025-01-17': [
    {
      id: 6,
      title: 'Cours de Yoga',
      time: '11:00',
      location: 'Bastille',
      image: 'yoga',
      price: 'Gratuit',
      status: 'organisateur',
      participants: '6/6',
      date: '2025-01-17',
    },
    {
      id: 7,
      title: 'Concert Jazz',
      time: '19:00',
      location: 'Opéra',
      image: 'cuisine',
      price: '45€',
      status: 'inscrit',
      participants: '50/100',
      date: '2025-01-17',
    },
    {
      id: 8,
      title: 'Exposition Art',
      time: '14:00',
      location: 'Louvre',
      image: 'musee',
      price: '25€',
      status: 'inscrire',
      participants: '80/150',
      date: '2025-01-17',
    },
  ],
  '2025-01-18': [
    {
      id: 9,
      title: 'Workshop Photo',
      time: '10:00',
      location: 'Montparnasse',
      image: 'guitare',
      price: '35€',
      status: 'inscrit',
      participants: '15/20',
      date: '2025-01-18',
    },
    {
      id: 10,
      title: 'Festival de Musique',
      time: '16:00',
      location: 'Parc de la Villette',
      image: 'escape',
      price: '30€',
      status: 'inscrire',
      participants: '120/200',
      date: '2025-01-18',
    },
  ],
  '2025-01-19': [
    {
      id: 11,
      title: 'Cours de Danse',
      time: '18:00',
      location: 'Marais',
      image: 'cocktails',
      price: '40€',
      status: 'inscrit',
      participants: '12/15',
      date: '2025-01-19',
    },
  ],
  '2025-01-20': [
    {
      id: 12,
      title: 'Conférence Tech',
      time: '14:00',
      location: 'Station F',
      image: 'yoga',
      price: 'Gratuit',
      status: 'inscrire',
      participants: '200/300',
      date: '2025-01-20',
    },
    {
      id: 13,
      title: 'Atelier Poterie',
      time: '10:00',
      location: 'Belleville',
      image: 'cuisine',
      price: '28€',
      status: 'inscrit',
      participants: '8/10',
      date: '2025-01-20',
    },
  ],
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const day = days[date.getDay()];
  const dayNumber = date.getDate();
  const month = months[date.getMonth()];
  return `${day} ${dayNumber} ${month}`;
};

export function TicketsPage() {
  const sortedDates = Object.keys(eventsByDate).sort();

  return (
    <div className="tickets-page">
      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Discover"
            className="search-input"
          />
          <button className="filter-button" aria-label="Filter">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Categories */}
      <section className="categories-section">
        <div className="section-header">
          <h3 className="section-title">Categories</h3>
          <button className="see-all">See all</button>
        </div>
        <div className="categories-list">
          <button className="category-item active">
            <div className="category-image live-shows"></div>
            <span className="category-text">Live shows</span>
          </button>
          <button className="category-item">
            <div className="category-image tourism"></div>
            <span className="category-text">Tourism</span>
          </button>
          <button className="category-item">
            <div className="category-image fever-origin"></div>
            <span className="category-text">Fever Origin</span>
          </button>
          <button className="category-item">
            <div className="category-image events"></div>
            <span className="category-text">Events</span>
          </button>
          <button className="category-item">
            <div className="category-image concerts"></div>
            <span className="category-text">Concerts</span>
          </button>
        </div>
      </section>

      {/* Main Event Card */}
      <section className="main-event-section">
        <div className="main-event-card">
          <div className="event-image">
            <div className="event-date">May 20</div>
            <button className="heart-button" aria-label="Like">
              <Heart size={20} />
            </button>
            <div className="event-image-placeholder">
              <div className="stage-lights"></div>
            </div>
          </div>
          <div className="event-content">
            <h3 className="event-title">Blackpink Concert</h3>
            <p className="event-location">123 Main Street, New York</p>
            <div className="event-footer">
              <div className="event-stats">
                <span className="views">1.2K</span>
                <div className="attendees">
                  <div className="attendee-avatar yellow"></div>
                  <div className="attendee-avatar blue"></div>
                  <div className="attendee-avatar red"></div>
                </div>
              </div>
              <div className="event-price">$40.230</div>
              <button className="join-button">Join now</button>
            </div>
          </div>
        </div>
      </section>

      {/* Top 10 Section */}
      <section className="top-events-section">
        <div className="section-header">
          <h3 className="section-title">Top 10 in London</h3>
          <button className="see-all">See all</button>
        </div>
        <div className="events-list">
          <div className="event-card-small">
            <div className="event-image-small fantasy"></div>
            <div className="event-info-small">
              <div className="event-rating">★ 5.0</div>
              <button className="heart-button-small" aria-label="Like">
                <Heart size={16} />
              </button>
            </div>
          </div>
          <div className="event-card-small">
            <div className="event-image-small dark"></div>
            <div className="event-info-small">
              <div className="event-rating">★ 5.0</div>
              <button className="heart-button-small" aria-label="Like">
                <Heart size={16} />
              </button>
            </div>
          </div>
          <div className="event-card-small">
            <div className="event-image-small fantasy"></div>
            <div className="event-info-small">
              <div className="event-rating">★ 5.0</div>
              <button className="heart-button-small" aria-label="Like">
                <Heart size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid by Date */}
      <div className="events-by-date-container">
        {sortedDates.map((date) => (
          <section key={date} className="date-events-section">
            <div className="date-header">
              <h3 className="date-title">{formatDate(date)}</h3>
            </div>
            <div className="events-grid">
              {eventsByDate[date].map((event) => (
                <div key={event.id} className="event-card">
                  <div className="event-image-container">
                    <div className={`event-image ${event.image}`}></div>
                    
                    <div className={`status-badge ${event.status}`}>
                      {event.status === 'inscrit' && (
                        <>
                          <Check size={12} />
                          <span>Inscrit</span>
                        </>
                      )}
                      {event.status === 'inscrire' && (
                        <>
                          <Plus size={12} />
                          <span>+ S'inscrire</span>
                        </>
                      )}
                      {event.status === 'organisateur' && (
                        <span>Organisateur</span>
                      )}
                    </div>

                    <div className="price-badge">
                      <span>{event.price}</span>
                    </div>

                    <div className="participants-overlay">
                      <div className="participants-avatars">
                        <div className="participant-avatar avatar-1"></div>
                        <div className="participant-avatar avatar-2"></div>
                        <div className="participant-avatar avatar-3"></div>
                      </div>
                      <div className="participants-count">
                        <span>{event.participants}</span>
                      </div>
                    </div>
                  </div>

                  <div className="event-details">
                    <h3 className="event-title">{event.title}</h3>
                    <div className="event-info">
                      <div className="info-item">
                        <Clock size={14} className="info-icon" />
                        <span className="info-text">{event.time}</span>
                      </div>
                      <div className="info-item">
                        <MapPin size={14} className="info-icon" />
                        <span className="info-text">{event.location}</span>
                      </div>
                      <button className="favorite-button" aria-label="Favorite">
                        <Heart size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
