import { Search, Filter, Heart } from 'lucide-react';
import './HomePage.css';

export function HomePage() {
  return (
    <div className="home-page">
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
    </div>
  );
}
