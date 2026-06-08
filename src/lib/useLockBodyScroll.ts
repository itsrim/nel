import { useEffect } from "react";

const SCROLL_LOCK_ATTR = "data-scroll-lock";

function isInsideScrollLockSurface(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(`[${SCROLL_LOCK_ATTR}]`));
}

/** Bloque le scroll de la page (y compris molette desktop) ; scroll autorisé dans `[data-scroll-lock]`. */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const main = document.querySelector<HTMLElement>(".app-content");
    const scrollY = window.scrollY;
    const mainScrollTop = main?.scrollTop ?? 0;
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;

    const prev = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      bodyPaddingRight: document.body.style.paddingRight,
      mainOverflow: main?.style.overflow ?? "",
    };

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`;
    }
    if (main) main.style.overflow = "hidden";

    const blockBackgroundScroll = (e: WheelEvent | TouchEvent) => {
      if (isInsideScrollLockSurface(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener("wheel", blockBackgroundScroll, { passive: false });
    document.addEventListener("touchmove", blockBackgroundScroll, { passive: false });

    return () => {
      document.documentElement.style.overflow = prev.htmlOverflow;
      document.body.style.overflow = prev.bodyOverflow;
      document.body.style.position = prev.bodyPosition;
      document.body.style.top = prev.bodyTop;
      document.body.style.width = prev.bodyWidth;
      document.body.style.paddingRight = prev.bodyPaddingRight;
      if (main) {
        main.style.overflow = prev.mainOverflow;
        main.scrollTop = mainScrollTop;
      }
      window.scrollTo(0, scrollY);
      document.removeEventListener("wheel", blockBackgroundScroll);
      document.removeEventListener("touchmove", blockBackgroundScroll);
    };
  }, [locked]);
}

export const scrollLockSurfaceAttr = SCROLL_LOCK_ATTR;
