import CryptoJS from 'crypto-js';

import {
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_UPLOAD_FOLDER,
  imageKitProfileAvatarFileName,
} from '../constants/imagekit';

const UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

function getPrivateKey(): string {
  const k = import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY?.trim();
  if (!k) {
    throw new Error(
      'Clé privée ImageKit absente : aucune requête POST vers upload.imagekit.io ne partira. ' +
        'Créez un fichier .env à la racine du projet nel avec VITE_IMAGEKIT_PRIVATE_KEY=votre_clé_privée, ' +
        'puis redémarrez Vite (npm run dev). Clé : tableau ImageKit → Developer → API keys → Private key.',
    );
  }
  return k;
}

function sign(token: string, expire: number, privateKey: string): string {
  return CryptoJS.HmacSHA1(token + expire, privateKey).toString(CryptoJS.enc.Hex);
}

function randomToken(): string {
  const bytes = new Uint8Array(20);
  try {
    const c = globalThis.crypto;
    if (c && typeof c.getRandomValues === 'function') {
      c.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    /* ignore */
  }
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export type UploadImageKitOptions = {
  mimeType?: string | null;
  /** Fichier issu de `<input type="file">` — requis pour l’upload navigateur. */
  webFile: File;
  userKey: string;
};

function inferMimeTypeFromName(name: string): string | null {
  const u = name.split('?')[0]?.toLowerCase() ?? '';
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.gif')) return 'image/gif';
  if (u.endsWith('.heic') || u.endsWith('.heif')) return 'image/heic';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

function resolveUploadMime(options: UploadImageKitOptions): string {
  const fromPicker = options.mimeType?.trim();
  if (fromPicker) return fromPicker;
  const fromFile = options.webFile.type?.trim();
  if (fromFile) return fromFile;
  const fromName = inferMimeTypeFromName(options.webFile.name);
  if (fromName) return fromName;
  return 'image/jpeg';
}

async function postImageKitUpload(p: {
  webFile: File;
  fileName: string;
  folder: string;
  useUniqueFileName: boolean;
  overwriteFile: boolean;
}): Promise<string> {
  const privateKey = getPrivateKey();
  const token = randomToken();
  const expire = Math.floor(Date.now() / 1000) + 900;

  const form = new FormData();
  form.append('fileName', p.fileName);
  form.append('publicKey', IMAGEKIT_PUBLIC_KEY);
  form.append('signature', sign(token, expire, privateKey));
  form.append('token', token);
  form.append('expire', String(expire));
  form.append('folder', p.folder);
  form.append('useUniqueFileName', p.useUniqueFileName ? 'true' : 'false');
  form.append('overwriteFile', p.overwriteFile ? 'true' : 'false');
  form.append('file', p.webFile, p.fileName);

  const resp = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: form,
  });

  const json = (await resp.json()) as { url?: string; message?: string };
  if (!resp.ok) {
    throw new Error(json.message || `ImageKit upload échoué (${resp.status})`);
  }
  if (!json.url || typeof json.url !== 'string') {
    throw new Error('Réponse ImageKit sans URL');
  }
  return json.url.trim();
}

/**
 * Avatar profil : même `fileName` + overwrite (un fichier par compte).
 */
export async function uploadLocalImageToImageKit(options: UploadImageKitOptions): Promise<string> {
  const mime = resolveUploadMime(options);
  const fileName = imageKitProfileAvatarFileName(options.userKey, mime);
  return postImageKitUpload({
    webFile: options.webFile,
    fileName,
    folder: IMAGEKIT_UPLOAD_FOLDER,
    useUniqueFileName: false,
    overwriteFile: true,
  });
}

const STORAGE_KEY = 'nel_imagekit_user_key';

/** Clé stable par navigateur (un avatar ImageKit écrasé par session « compte » locale). */
export function getNelProfileImageKitUserKey(): string {
  try {
    let v = localStorage.getItem(STORAGE_KEY);
    if (!v) {
      v = `nel_${Math.random().toString(36).slice(2, 14)}`;
      localStorage.setItem(STORAGE_KEY, v);
    }
    return v;
  } catch {
    return 'nel_fallback';
  }
}
