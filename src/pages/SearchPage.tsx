import { Clock, MapPin, Heart, Check, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import './SearchPage.css';

interface Event {
  id: number;
  title: string;
  time: string;
  location: string;
  image: string;
  price: string;
  status: 'inscrit' | 'inscrire' | 'organisateur';
  participants: string;
  date: string; // Format: "YYYY-MM-DD"
}

const eventsByDate: Record<string, Event[]> = {
  '2025-01-01': [
    {
      id: 1,
      title: 'Atelier Cuisine Italienne',
      time: '08:00',
      location: 'Montmartre',
      image: 'cuisine',
      price: '57€',
      status: 'inscrit',
      participants: '22/20',
      date: '2025-01-01',
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
      date: '2025-01-01',
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
      date: '2025-01-01',
    },
    {
      id: 4,
      title: 'Escape Game',
      time: '08:00',
      location: 'Station F',
      image: 'escape',
      price: '56€',
      status: 'inscrit',
      participants: '21/20',
      date: '2025-01-01',
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
      date: '2025-01-01',
    },
    {
      id: 6,
      title: 'Cours de Yoga',
      time: '11:00',
      location: 'Bastille',
      image: 'yoga',
      price: 'Gratuit',
      status: 'organisateur',
      participants: '6/6',
      date: '2025-01-01',
    },
  ],
  '2025-01-02': [
    {
      id: 7,
      title: 'Concert Jazz',
      time: '19:00',
      location: 'Opéra',
      image: 'cuisine',
      price: '45€',
      status: 'inscrit',
      participants: '50/100',
      date: '2025-01-02',
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
      date: '2025-01-02',
    },
  ],
  '2025-01-03': [
    {
      id: 9,
      title: 'Workshop Photo',
      time: '10:00',
      location: 'Montparnasse',
      image: 'guitare',
      price: '35€',
      status: 'inscrit',
      participants: '15/20',
      date: '2025-01-03',
    },
  ],
};

const dates = [
  { day: 29, label: 'Dim', date: '2024-12-29' },
  { day: 30, label: 'Lun', date: '2024-12-30' },
  { day: 31, label: 'Mar', date: '2024-12-31' },
  { day: 1, label: 'Mer', date: '2025-01-01' },
  { day: 2, label: 'Jeu', date: '2025-01-02' },
  { day: 3, label: 'Ven', date: '2025-01-03' },
  { day: 4, label: 'Sam', date: '2025-01-04' },
];

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const day = days[date.getDay()];
  const dayNumber = date.getDate();
  const month = months[date.getMonth()];
  return `${day} ${dayNumber} ${month}`;
};

export function SearchPage() {
  const [selectedDate, setSelectedDate] = useState('2025-01-01');
  const dateSectionsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const isScrollingToDate = useRef(false);

  const sortedDates = Object.keys(eventsByDate).sort();

  useEffect(() => {
    const handleScroll = () => {
      // Ne pas mettre à jour si on est en train de scroller vers une date (clic sur calendrier)
      if (isScrollingToDate.current) {
        return;
      }

      const viewportCenter = window.innerHeight / 2;
      let closestDate = selectedDate;
      let closestDistance = Infinity;

      // Trouver la section la plus proche du centre de l'écran
      Object.entries(dateSectionsRef.current).forEach(([date, element]) => {
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementCenter = rect.top + rect.height / 2;
          const distance = Math.abs(viewportCenter - elementCenter);

          // Vérifier que l'élément est visible dans le viewport
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            if (distance < closestDistance) {
              closestDistance = distance;
              closestDate = date;
            }
          }
        }
      });

      if (closestDate !== selectedDate) {
        setSelectedDate(closestDate);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Vérifier au chargement initial

    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedDate]);

  return (
    <div className="search-page">
      {/* Calendar Section */}
      <section className="calendar-section">
        <div className="days-scroller">
          {dates.map((dateItem) => (
            <button
              key={dateItem.date}
              className={`day-button ${selectedDate === dateItem.date ? 'active' : ''}`}
              onClick={() => {
                isScrollingToDate.current = true;
                setSelectedDate(dateItem.date);
                const section = dateSectionsRef.current[dateItem.date];
                if (section) {
                  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  // Réinitialiser le flag après le scroll
                  setTimeout(() => {
                    isScrollingToDate.current = false;
                  }, 1000);
                } else {
                  isScrollingToDate.current = false;
                }
              }}
            >
              <span className="day-number">{dateItem.day}</span>
              <span className="day-label">{dateItem.label}</span>
            </button>
          ))}
        </div>
        <div className="current-date">
          <span>{formatDate(selectedDate)}</span>
        </div>
      </section>

      {/* Events by Date */}
      <div className="events-container">
        {sortedDates.map((date) => (
          <div
            key={date}
            ref={(el) => (dateSectionsRef.current[date] = el)}
            className="date-section"
          >
            <div className="events-grid">
              {eventsByDate[date].map((event) => (
                <div key={event.id} className="event-card">
                  <div className="event-image-container">
                    <div className={`event-image ${event.image}`}></div>
                    
                    {/* Status Badge */}
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

                    {/* Price Badge */}
                    <div className="price-badge">
                      <span>{event.price}</span>
                    </div>

                    {/* Participants */}
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

                  {/* Event Details */}
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
          </div>
        ))}
      </div>
    </div>
  );
}
