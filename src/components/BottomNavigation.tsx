import { createPortal } from "react-dom";
import { MessageCircle, Calendar, User, Briefcase } from "lucide-react";
import { useNavigationStore, type TabId } from "../store/useNavigationStore";
import { useTranslation } from "../i18n/useTranslation";
import "./BottomNavigation.css";

interface NavItem {
  id: TabId;
  labelKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export function BottomNavigation() {
  const { activeTab, setActiveTab } = useNavigationStore();
  const { t } = useTranslation();

  const navItems: NavItem[] = [
    { id: "chat", labelKey: "navChat", icon: MessageCircle },
    { id: "events", labelKey: "navSortie", icon: Calendar },
    { id: "pro", labelKey: "pro", icon: Briefcase },
    { id: "profile", labelKey: "profile", icon: User },
  ];

  const nav = (
    <nav className="floating-tab-bar" aria-label="Navigation principale">
      <div className="floating-tab-bar-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              className={`ftb-item ${isActive ? "ftb-item--active" : ""}`}
              onClick={() => setActiveTab(item.id)}
              aria-label={t(item.labelKey as any)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={20} className="ftb-icon" />
              <span className="ftb-label">{t(item.labelKey as any)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  if (typeof document === "undefined") return nav;
  return createPortal(nav, document.body);
}
