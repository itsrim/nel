import { Wallet, ShoppingCart, Briefcase } from 'lucide-react';
import { useNavigationStore, type TabId } from '../store/useNavigationStore';
import './BottomNavigation.css';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3 12L12 3L21 12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21V12H15V21" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M7 15L9 13L11 15L13 11L15 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function ExchangeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <circle cx="12" cy="12" r="7" fill="white" opacity="0.2" />
      <circle cx="12" cy="12" r="4" fill="white" opacity="0.4" />
      <path d="M12 8L13.5 10.5L12 13L10.5 10.5L12 8Z" fill="white" />
      <path d="M12 11L13.5 13.5L12 16L10.5 13.5L12 11Z" fill="white" />
    </svg>
  );
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'exchange', label: 'Exchange', icon: ExchangeIcon },
  { id: 'markets', label: 'Markets', icon: ShoppingCart },
  { id: 'profile', label: 'Profile', icon: Briefcase },
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
            <div className="nav-icon-wrapper">
              {item.id === 'exchange' && isActive ? (
                <div className="exchange-icon-active">
                  <Icon className="nav-icon" />
                </div>
              ) : (
                <Icon className="nav-icon" />
              )}
            </div>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
