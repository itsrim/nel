import { Search, Filter, Gift, Heart, Users } from 'lucide-react';
import './HomePage.css';

export function HomePage() {
  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <div className="status-bar">
          <span className="time">9:41</span>
          <div className="status-icons">
            <span>📶</span>
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>
        <div className="welcome-section">
          <div className="profile-picture">
            <div className="avatar">CJ</div>
          </div>
          <div className="welcome-text">
            <span className="welcome-label">Welcome Back</span>
            <h2 className="user-name">Christian Johnson</h2>
          </div>
          <button className="gift-button" aria-label="Gift">
            <Gift size={24} />
          </button>
        </div>
      </header>

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
            <div className="category-icon">🎤</div>
            <span>Live shows</span>
          </button>
          <button className="category-item">
            <div className="category-icon">🚶</div>
            <span>Tourism</span>
          </button>
          <button className="category-item">
            <div className="category-icon">👤</div>
            <span>Fever Origin</span>
          </button>
          <button className="category-item">
            <div className="category-icon">🎭</div>
            <span>Events</span>
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
    </div>
  );
}
