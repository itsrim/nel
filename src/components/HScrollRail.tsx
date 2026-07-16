import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import "./HScrollRail.css";

export type HScrollFadeTone = "peach" | "ink";

type HScrollRailProps = {
  children: ReactNode;
  /** Classes on the outer rail (sticky shell, margins, etc.). */
  className?: string;
  /** Classes on the scrollable row. */
  scrollClassName?: string;
  fadeTone?: HScrollFadeTone;
  /** Ref on the outer rail (useful for sticky layout measurements). */
  railRef?: Ref<HTMLDivElement>;
  id?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children" | "id">;

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else ref.current = value;
}

export function HScrollRail({
  children,
  className,
  scrollClassName,
  fadeTone = "ink",
  railRef,
  id,
  ...scrollProps
}: HScrollRailProps) {
  const { t } = useTranslation();
  const scrollElRef = useRef<HTMLDivElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);

  const updateOverflow = useCallback(() => {
    const el = scrollElRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollMore(max > 4 && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollElRef.current;
    if (!el) return;

    const scheduleUpdate = () => {
      requestAnimationFrame(updateOverflow);
    };

    updateOverflow();
    scheduleUpdate();
    el.addEventListener("scroll", updateOverflow, { passive: true });
    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    const mo = new MutationObserver(scheduleUpdate);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", scheduleUpdate);
    void document.fonts?.ready?.then(scheduleUpdate);
    return () => {
      el.removeEventListener("scroll", updateOverflow);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [updateOverflow, children]);

  const scrollMore = () => {
    const el = scrollElRef.current;
    if (!el) return;
    el.scrollBy({
      left: Math.max(140, Math.round(el.clientWidth * 0.5)),
      behavior: "smooth",
    });
  };

  return (
    <div
      id={id}
      ref={(node) => setRef(railRef, node)}
      className={[
        "h-scroll-rail",
        canScrollMore ? "h-scroll-rail--more" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-fade={fadeTone}
    >
      <div
        ref={scrollElRef}
        className={["h-scroll-rail__scroll", scrollClassName ?? ""]
          .filter(Boolean)
          .join(" ")}
        {...scrollProps}
      >
        {children}
      </div>
      {canScrollMore ? (
        <>
          <div className="h-scroll-rail__fade" aria-hidden />
          <button
            type="button"
            className="h-scroll-rail__chevron"
            onClick={scrollMore}
            aria-label={t("scrollHorizontallyMore")}
          >
            <ChevronRight size={18} strokeWidth={2.4} aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}
