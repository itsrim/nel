export type CompressImagePreset = "avatar" | "eventCover" | "splash";

export type CompressImageOptions = {
  maxWidth: number;
  maxHeight: number;
  /** 0–1, JPEG / WebP uniquement. */
  quality: number;
  outputMime?: "image/jpeg" | "image/webp";
  /** Sous ce seuil (octets), on garde l’original si déjà aux bonnes dimensions. */
  skipBelowBytes?: number;
};

const PRESETS: Record<CompressImagePreset, CompressImageOptions> = {
  avatar: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.82,
    skipBelowBytes: 180_000,
  },
  eventCover: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.85,
    skipBelowBytes: 350_000,
  },
  splash: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.85,
    skipBelowBytes: 400_000,
  },
};

function scaleDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function outputExtension(mime: string): string {
  return mime.includes("webp") ? "webp" : "jpg";
}

async function loadImageSource(file: File): Promise<
  | { kind: "bitmap"; bitmap: ImageBitmap }
  | { kind: "element"; element: HTMLImageElement; revoke?: () => void }
> {
  if (typeof createImageBitmap === "function") {
    try {
      return { kind: "bitmap", bitmap: await createImageBitmap(file) };
    } catch {
      /* fallback img */
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const element = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
    return {
      kind: "element",
      element,
      revoke: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function readSourceSize(
  source:
    | { kind: "bitmap"; bitmap: ImageBitmap }
    | { kind: "element"; element: HTMLImageElement },
): { width: number; height: number } {
  if (source.kind === "bitmap") {
    return { width: source.bitmap.width, height: source.bitmap.height };
  }
  return { width: source.element.naturalWidth, height: source.element.naturalHeight };
}

function drawSource(
  ctx: CanvasRenderingContext2D,
  source:
    | { kind: "bitmap"; bitmap: ImageBitmap }
    | { kind: "element"; element: HTMLImageElement },
  width: number,
  height: number,
): void {
  if (source.kind === "bitmap") {
    ctx.drawImage(source.bitmap, 0, 0, width, height);
    return;
  }
  ctx.drawImage(source.element, 0, 0, width, height);
}

function releaseSource(
  source:
    | { kind: "bitmap"; bitmap: ImageBitmap }
    | { kind: "element"; element: HTMLImageElement; revoke?: () => void },
): void {
  if (source.kind === "bitmap") {
    source.bitmap.close();
    return;
  }
  source.revoke?.();
}

/** Compresse / redimensionne une image avant upload. Retourne l’original en cas d’échec. */
export async function compressImageFile(
  file: File,
  presetOrOptions: CompressImagePreset | CompressImageOptions,
): Promise<File> {
  const options =
    typeof presetOrOptions === "string"
      ? PRESETS[presetOrOptions]
      : presetOrOptions;

  const type = file.type?.toLowerCase() ?? "";
  if (!type.startsWith("image/")) return file;
  if (type === "image/gif" || type === "image/svg+xml") return file;

  let source: Awaited<ReturnType<typeof loadImageSource>> | null = null;
  try {
    source = await loadImageSource(file);
    const { width: srcW, height: srcH } = readSourceSize(source);
    const { width, height } = scaleDimensions(
      srcW,
      srcH,
      options.maxWidth,
      options.maxHeight,
    );

    const unchangedSize = width === srcW && height === srcH;
    if (
      unchangedSize &&
      options.skipBelowBytes != null &&
      file.size <= options.skipBelowBytes
    ) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    drawSource(ctx, source, width, height);

    const outputMime = options.outputMime ?? "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputMime, options.quality);
    });
    if (!blob || blob.size === 0) return file;
    if (blob.size >= file.size && unchangedSize) return file;

    const ext = outputExtension(outputMime);
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.${ext}`, {
      type: outputMime,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    if (source) releaseSource(source);
  }
}
