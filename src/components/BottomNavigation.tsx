import { MessageCircle, Calendar, User } from 'lucide-react';
import { useNavigationStore, type TabId } from '../store/useNavigationStore';
import './BottomNavigation.css';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'events', label: 'Event', icon: Calendar },
  { id: 'profile', label: 'Profil', icon: User },
];

export function BottomNavigation() {
  const { activeTab, setActiveTab } = useNavigationStore();

  return (
    <nav className="floating-tab-bar">
      <div className="floating-tab-bar-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              className={`ftb-item ${isActive ? 'ftb-item--active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
            >
              <Icon size={20} className="ftb-icon" />
              <span className="ftb-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
