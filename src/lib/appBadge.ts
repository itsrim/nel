/**
 * Utilitaires pour afficher un badge de notifications non lues :
 * - Favicon badge (onglet navigateur desktop)
 * - App Badge API (icône PWA, desktop + mobile)
 */

const FAVICON_HREF_DEFAULT = '/icons/favicon.ico';
const FAVICON_SIZE = 32;
const BADGE_COLOR = '#ff3b30';
const BADGE_TEXT_COLOR = '#ffffff';

let faviconCanvas: HTMLCanvasElement | null = null;
let faviconImg: HTMLImageElement | null = null;

async function ensureFaviconImage(): Promise<HTMLImageElement | null> {
  if (faviconImg) return faviconImg;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = FAVICON_HREF_DEFAULT;
    img.onload = () => {
      faviconImg = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
  });
}

function drawBadgeOnCanvas(count: number): string | null {
  if (!faviconCanvas) {
    faviconCanvas = document.createElement('canvas');
  }
  const canvas = faviconCanvas;
  canvas.width = FAVICON_SIZE;
  canvas.height = FAVICON_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);

  if (faviconImg) {
    ctx.drawImage(faviconImg, 0, 0, FAVICON_SIZE, FAVICON_SIZE);
  }

  if (count > 0) {
    const badgeX = FAVICON_SIZE - 1;
    const badgeY = 1;
    const radius = 9;

    ctx.beginPath();
    ctx.arc(badgeX, badgeY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = BADGE_COLOR;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const text = count > 99 ? '99+' : String(count);
    ctx.fillStyle = BADGE_TEXT_COLOR;
    ctx.font = 'bold 10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, badgeX, badgeY);
  }

  return canvas.toDataURL('image/png');
}

export function updateFaviconBadge(count: number): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;

  if (count <= 0) {
    link.href = FAVICON_HREF_DEFAULT;
    return;
  }

  void ensureFaviconImage().then(() => {
    const dataUrl = drawBadgeOnCanvas(count);
    if (dataUrl) {
      link.href = dataUrl;
    }
  });
}

export async function updateAppBadge(count: number): Promise<void> {
  try {
    if ('setAppBadge' in navigator && typeof navigator.setAppBadge === 'function') {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
    } else if (
      'setExperimentalAppBadge' in navigator &&
      typeof (navigator as unknown as Record<string, unknown>).setExperimentalAppBadge === 'function'
    ) {
      const nav = navigator as unknown as {
        setExperimentalAppBadge: (count: number) => Promise<void>;
        clearExperimentalAppBadge: () => Promise<void>;
      };
      if (count > 0) {
        await nav.setExperimentalAppBadge(count);
      } else {
        await nav.clearExperimentalAppBadge();
      }
    }
  } catch {
    // Badging API non disponible — silencieux
  }
}

export function updateAllBadges(chatUnread: number, profileUnread: number): void {
  const total = chatUnread + profileUnread;
  updateFaviconBadge(total);
  void updateAppBadge(total);
}