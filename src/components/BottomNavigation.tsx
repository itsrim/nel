import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, Calendar, User, Handbag } from "lucide-react";
import { useNavigationStore, type TabId } from "../store/useNavigationStore";
import { useTranslation } from "../i18n/useTranslation";
import type { TranslationKey } from "../i18n/translations";
import { useMessagingStore } from "../store/useMessagingStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatBadgeCount } from "../data/mockData";
import {
  countProfileNavBadge,
  countUnreadChatMessages,
} from "../lib/navBadges";
import "./BottomNavigation.css";

interface NavItem {
  id: TabId;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: "chat" | "profile";
}

const NAV_ITEMS: NavItem[] = [
  { id: "chat", labelKey: "navChat", icon: MessageCircle, badge: "chat" },
  { id: "events", labelKey: "navSortie", icon: Calendar },
  { id: "pro", labelKey: "pro", icon: Handbag },
  { id: "profile", labelKey: "profile", icon: User, badge: "profile" },
];

export function BottomNavigation() {
  const { activeTab, setActiveTab } = useNavigationStore();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const conversations = useMessagingStore((s) => s.conversations);
  const events = useMessagingStore((s) => s.events);
  const appNotifications = useMessagingStore((s) => s.appNotifications);
  const profileVisits = useMessagingStore((s) => s.profileVisits);
  const friends = useMessagingStore((s) => s.friends);
  const isAdmin = useMessagingStore((s) => s.isAdmin);
  const innerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const unreadChatCount = useMemo(
    () =>
      countUnreadChatMessages({
        adminModeActive: isAdmin,
        user,
        conversations,
        events,
      }),
    [isAdmin, user, conversations, events],
  );

  const profileBadgeCount = useMemo(
    () =>
      countProfileNavBadge({
        appNotifications,
        profileVisits,
        friends,
      }),
    [appNotifications, profileVisits, friends],
  );

  const activeIndex = NAV_ITEMS.findIndex((item) => item.id === activeTab);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    const activeEl = itemRefs.current[activeIndex];
    if (!inner || !activeEl || activeIndex < 0) return;

    const update = () => {
      const innerRect = inner.getBoundingClientRect();
      const rect = activeEl.getBoundingClientRect();
      setIndicator({
        left: rect.left - innerRect.left,
        width: rect.width,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(inner);
    ro.observe(activeEl);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [activeTab, activeIndex]);

  const nav = (
    <nav className="floating-tab-bar" aria-label="Navigation principale">
      <div className="floating-tab-bar-inner" ref={innerRef}>
        <div
          className="ftb-indicator"
          style={{
            width: indicator.width,
            transform: `translateX(${indicator.left}px)`,
          }}
          aria-hidden
        />
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const label = t(item.labelKey);
          const showChatBadge = item.badge === "chat" && unreadChatCount > 0;
          const showProfileBadge =
            item.badge === "profile" && profileBadgeCount > 0;
          const ariaLabel =
            showProfileBadge || showChatBadge
              ? `${label}, ${t("unreadCount")}`
              : label;

          return (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              className={`ftb-item ${isActive ? "ftb-item--active" : ""}`}
              onClick={() => setActiveTab(item.id)}
              aria-label={ariaLabel}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="ftb-icon-wrap">
                <span className="ftb-icon-anchor">
                  <Icon size={isActive ? 22 : 20} className="ftb-icon" />
                  {showChatBadge ? (
                    <span className="ftb-badge ftb-badge--chat" aria-hidden>
                      {formatBadgeCount(unreadChatCount)}
                    </span>
                  ) : null}
                  {showProfileBadge ? (
                    <span className="ftb-badge ftb-badge--profile" aria-hidden>
                      {formatBadgeCount(profileBadgeCount)}
                    </span>
                  ) : null}
                </span>
              </span>
              {isActive ? <span className="ftb-label">{label}</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );

  if (typeof document === "undefined") return nav;
  return createPortal(nav, document.body);
}
