import { Home, Search, User } from 'lucide-react';
import { useNavigationStore, type TabId } from '../store/useNavigationStore';
import { TicketIcon } from './TicketIcon';
import './BottomNavigation.css';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'tickets', label: 'Event', icon: TicketIcon },
  { id: 'profile', label: 'Profil', icon: User },
];

export function BottomNavigation() {
  const { activeTab, setActiveTab } = useNavigationStore();

  return (
    <nav className="bottom-navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-label={item.label}
          >
            <Icon size={isActive ? 20 : 24} className="nav-icon" />
            {isActive && <span className="nav-label">{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
