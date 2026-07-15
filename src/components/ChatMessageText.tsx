import { useMemo, useCallback } from "react";
import { useNavigationStore } from "../store/useNavigationStore";
import {
  hasHappyLetsGoLink,
  splitHappyLetsGoLinks,
} from "../lib/linkifyHappyLetsGo";

interface ChatMessageTextProps {
  text: string;
}

export function ChatMessageText({ text }: ChatMessageTextProps) {
  const { openDetail } = useNavigationStore();
  const hasLink = useMemo(() => hasHappyLetsGoLink(text), [text]);
  const segments = useMemo(
    () => (hasLink ? splitHappyLetsGoLinks(text) : null),
    [hasLink, text],
  );

  const handleEventLink = useCallback(
    (eventId: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      e.stopPropagation();
      openDetail("event", eventId);
    },
    [openDetail],
  );

  if (!hasLink || !segments) {
    return <p className="cr-text">{text}</p>;
  }

  return (
    <p className="cr-text">
      {segments.map((seg, i) =>
        seg.kind === "text" ? (
          <span key={i} className="cr-text-plain">
            {seg.value}
          </span>
        ) : seg.eventId ? (
          <a
            key={i}
            href={seg.href}
            className="cr-text-link"
            onClick={handleEventLink(seg.eventId)}
          >
            {seg.value}
          </a>
        ) : (
          <a
            key={i}
            href={seg.href}
            className="cr-text-link"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {seg.value}
          </a>
        ),
      )}
    </p>
  );
}
