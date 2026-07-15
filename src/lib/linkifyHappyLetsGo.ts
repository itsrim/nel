export type TextSegment = { kind: "text"; value: string };
export type LinkSegment = {
  kind: "link";
  value: string;
  href: string;
  eventId?: string;
};
export type MessageSegment = TextSegment | LinkSegment;

const HAPPY_LETS_GO_URL_RE =
  /https:\/\/(?:www\.)?happyletsgo\.fr\/[^\s<>"')\]]+/gi;

export function hasHappyLetsGoLink(text: string): boolean {
  return new RegExp(HAPPY_LETS_GO_URL_RE.source, HAPPY_LETS_GO_URL_RE.flags).test(
    text,
  );
}

function trimTrailingUrlPunctuation(url: string): {
  href: string;
  trailing: string;
} {
  const match = url.match(/([.,!?;:)\]]+)$/);
  if (!match) return { href: url, trailing: "" };
  return {
    href: url.slice(0, -match[1].length),
    trailing: match[1],
  };
}

function parseHappyLetsGoLink(href: string): LinkSegment {
  try {
    const url = new URL(href);
    const eventMatch = url.pathname.match(/^\/event\/([^/]+)/);
    if (eventMatch?.[1]) {
      const eventId = decodeURIComponent(eventMatch[1]);
      return { kind: "link", value: href, href, eventId };
    }
  } catch {
    /* ignore invalid URL */
  }
  return { kind: "link", value: href, href };
}

/** Découpe un message en segments texte + liens HappyLetsGo cliquables. */
export function splitHappyLetsGoLinks(text: string): MessageSegment[] {
  if (!text) return [{ kind: "text", value: "" }];

  const segments: MessageSegment[] = [];
  let lastIndex = 0;
  const re = new RegExp(HAPPY_LETS_GO_URL_RE.source, HAPPY_LETS_GO_URL_RE.flags);

  for (const match of text.matchAll(re)) {
    const raw = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, index) });
    }

    const { href, trailing } = trimTrailingUrlPunctuation(raw);
    if (href) segments.push(parseHappyLetsGoLink(href));
    if (trailing) segments.push({ kind: "text", value: trailing });

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ kind: "text", value: text }];
}
