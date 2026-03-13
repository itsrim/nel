import { Home, Search, User } from 'lucide-react';
import { useNavigationStore, type TabId } from '../store/useNavigationStore';
import { TicketIcon } from './TicketIcon';
import './BottomNavigation.css';

interface NavItem {
  id: TabId;
  label?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', icon: Search },
  { id: 'tickets', icon: TicketIcon },
  { id: 'profile', icon: User },
];

export function BottomNavigation() {
  const { activeTab, setActiveTab } = useNavigationStore();

  return (
    <nav className="bottom-navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const isHome = item.id === 'home';

        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''} ${isHome ? 'home-button' : 'icon-button'}`}
            onClick={() => setActiveTab(item.id)}
            aria-label={item.label || item.id}
          >
            <Icon size={isHome ? 20 : 24} className="nav-icon" />
            {isHome && <span className="nav-label">Home</span>}
          </button>
        );
      })}
    </nav>
  );
}
