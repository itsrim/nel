import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, HeartCrack, UserPlus } from "lucide-react";
import type { SuggestionProfile } from "../data/mockData";
import { formatSuggestionCaption } from "../data/mockData";
import { useTranslation } from "../i18n/useTranslation";
import {
  buildMasonryColumns,
  SUGGESTION_MASONRY_COLUMNS,
  SUGGESTION_PAGE_SIZE,
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

function SuggestionPhotoCard({
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
    <div className="suggestion-card">
      <button
        type="button"
        className="suggestion-img-press"
        onClick={() => onOpenProfile(item.id)}
        aria-label={formatSuggestionCaption(item.pseudo, item.age)}
      >
        <img
          src={item.imageUrl}
          alt=""
          className="suggestion-img"
          style={{ aspectRatio: item.aspectRatio }}
          loading="lazy"
        />
        <div className="suggestion-img-fade" aria-hidden />
        <span className="suggestion-caption">
          {formatSuggestionCaption(item.pseudo, item.age)}
        </span>
      </button>
      <button
        type="button"
        className={`suggestion-add-friend-btn${sent ? " suggestion-add-friend-btn--sent" : ""}${mutual ? " suggestion-add-friend-btn--friend" : ""}${rejected ? " suggestion-add-friend-btn--rejected" : ""}${dailyFriendRequestLimitReached && !sent ? " suggestion-add-friend-btn--daily-limit" : ""}`}
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
          <Heart size={22} color="#FF4081" fill="#FF4081" aria-hidden />
        ) : rejected ? (
          <HeartCrack size={22} color="#FF9F0A" aria-hidden />
        ) : (
          <UserPlus size={22} color="#fff" aria-hidden />
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

  const suggestionColumns = useMemo(
    () => buildMasonryColumns(pagedSuggestions, SUGGESTION_MASONRY_COLUMNS),
    [pagedSuggestions],
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

  if (suggestions.length === 0) {
    return <p className="suggestions-empty">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="suggestions-masonry">
        {suggestionColumns.map((col, ci) => (
          <div key={ci} className="suggestion-col">
            {col.map((item) => (
              <SuggestionPhotoCard
                key={item.id}
                item={item}
                onOpenProfile={onOpenProfile}
                isMutualFriend={isMutualFriend}
                hasSentFriendRequest={hasSentFriendRequest}
                hasRejectedFriendRequest={hasRejectedFriendRequest}
                dailyFriendRequestLimitReached={dailyFriendRequestLimitReached}
                isFriendRequestBlocked={isFriendRequestBlocked}
                onFriendRequest={onFriendRequest}
              />
            ))}
          </div>
        ))}
      </div>

      {hasMore ? (
        <>
          <div ref={loadMoreSentinelRef} className="suggestions-load-sentinel" aria-hidden />
          <p className="suggestions-loading-more">{loadingMoreLabel}</p>
        </>
      ) : null}
    </>
  );
}
