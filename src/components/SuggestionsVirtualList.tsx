import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Heart, HeartCrack, UserPlus } from "lucide-react";
import type { SuggestionProfile } from "../data/mockData";
import { formatSuggestionCaption } from "../data/mockData";
import { useTranslation } from "../i18n/useTranslation";
import {
  SUGGESTION_PAGE_SIZE,
  SUGGESTION_ROW_HEIGHT,
} from "../lib/suggestionListing";
import "./SuggestionsVirtualList.css";

type SuggestionsVirtualListProps = {
  suggestions: SuggestionProfile[];
  scrollRef: React.RefObject<HTMLElement | null>;
  listResetKey: string;
  loadingMoreLabel: string;
  emptyMessage: string;
  onOpenProfile: (id: string) => void;
  isMutualFriend: (id: string) => boolean;
  hasSentFriendRequest: (id: string) => boolean;
  hasRejectedFriendRequest: (id: string) => boolean;
  dailyFriendRequestLimitReached: boolean;
  isFriendRequestBlocked: (id: string) => boolean;
  onFriendRequest: (e: React.MouseEvent, id: string) => void;
};

function SuggestionListRow({
  item,
  onOpenProfile,
  isMutualFriend,
  hasSentFriendRequest,
  hasRejectedFriendRequest,
  dailyFriendRequestLimitReached,
  isFriendRequestBlocked,
  onFriendRequest,
}: {
  item: SuggestionProfile;
  onOpenProfile: (id: string) => void;
  isMutualFriend: (id: string) => boolean;
  hasSentFriendRequest: (id: string) => boolean;
  hasRejectedFriendRequest: (id: string) => boolean;
  dailyFriendRequestLimitReached: boolean;
  isFriendRequestBlocked: (id: string) => boolean;
  onFriendRequest: (e: React.MouseEvent, id: string) => void;
}) {
  const { t } = useTranslation();
  const sent = hasSentFriendRequest(item.id);
  const mutual = isMutualFriend(item.id);
  const rejected = hasRejectedFriendRequest(item.id);

  return (
    <div className="suggestion-list-row">
      <button
        type="button"
        className="suggestion-list-main"
        onClick={() => onOpenProfile(item.id)}
        aria-label={formatSuggestionCaption(item.pseudo, item.age)}
      >
        <img
          src={item.imageUrl}
          alt=""
          className="suggestion-list-avatar"
          loading="lazy"
        />
        <div className="suggestion-list-body">
          <span className="suggestion-list-name">{item.pseudo}</span>
          <span className="suggestion-list-age">{item.age}</span>
        </div>
      </button>
      <button
        type="button"
        className={`suggestion-list-add-btn${sent ? " suggestion-list-add-btn--sent" : ""}${mutual ? " suggestion-list-add-btn--friend" : ""}${rejected ? " suggestion-list-add-btn--rejected" : ""}${dailyFriendRequestLimitReached && !sent ? " suggestion-list-add-btn--daily-limit" : ""}`}
        disabled={isFriendRequestBlocked(item.id)}
        onClick={(e) => onFriendRequest(e, item.id)}
        aria-label={
          mutual
            ? t("friendLabel")
            : rejected
              ? t("requestRejected")
              : sent
                ? t("requestSent")
                : dailyFriendRequestLimitReached
                  ? t("friendRequestDailyLimit")
                  : t("sendFriendRequest")
        }
      >
        {mutual ? (
          <Heart size={20} color="#FF4081" fill="#FF4081" aria-hidden />
        ) : rejected ? (
          <HeartCrack size={20} color="#FF9F0A" aria-hidden />
        ) : (
          <UserPlus size={20} color="#fff" aria-hidden />
        )}
      </button>
    </div>
  );
}

export function SuggestionsVirtualList({
  suggestions,
  scrollRef,
  listResetKey,
  loadingMoreLabel,
  emptyMessage,
  onOpenProfile,
  isMutualFriend,
  hasSentFriendRequest,
  hasRejectedFriendRequest,
  dailyFriendRequestLimitReached,
  isFriendRequestBlocked,
  onFriendRequest,
}: SuggestionsVirtualListProps) {
  const [loadedCount, setLoadedCount] = useState(SUGGESTION_PAGE_SIZE);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoadedCount(SUGGESTION_PAGE_SIZE);
  }, [listResetKey]);

  const pagedSuggestions = useMemo(
    () => suggestions.slice(0, loadedCount),
    [suggestions, loadedCount],
  );

  const hasMore = loadedCount < suggestions.length;

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = loadMoreSentinelRef.current;
    if (!root || !sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoadedCount((n) =>
            Math.min(n + SUGGESTION_PAGE_SIZE, suggestions.length),
          );
        }
      },
      { root, rootMargin: "480px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scrollRef, hasMore, suggestions.length, pagedSuggestions.length]);

  const virtualizer = useVirtualizer({
    count: pagedSuggestions.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => SUGGESTION_ROW_HEIGHT,
    overscan: 8,
  });

  if (suggestions.length === 0) {
    return <p className="suggestions-empty">{emptyMessage}</p>;
  }

  const tailHeight = hasMore ? 72 : 0;
  const totalHeight = virtualizer.getTotalSize() + tailHeight;

  return (
    <div className="suggestions-virtual" style={{ height: totalHeight }}>
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const item = pagedSuggestions[virtualRow.index];
        return (
          <div
            key={item.id}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="suggestions-virtual-row"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            <SuggestionListRow
              item={item}
              onOpenProfile={onOpenProfile}
              isMutualFriend={isMutualFriend}
              hasSentFriendRequest={hasSentFriendRequest}
              hasRejectedFriendRequest={hasRejectedFriendRequest}
              dailyFriendRequestLimitReached={dailyFriendRequestLimitReached}
              isFriendRequestBlocked={isFriendRequestBlocked}
              onFriendRequest={onFriendRequest}
            />
          </div>
        );
      })}

      {hasMore && (
        <div
          ref={loadMoreSentinelRef}
          className="suggestions-load-sentinel"
          style={{ transform: `translateY(${virtualizer.getTotalSize()}px)` }}
          aria-hidden
        />
      )}

      {hasMore && (
        <p
          className="suggestions-loading-more"
          style={{ transform: `translateY(${virtualizer.getTotalSize() + 8}px)` }}
        >
          {loadingMoreLabel}
        </p>
      )}
    </div>
  );
}
