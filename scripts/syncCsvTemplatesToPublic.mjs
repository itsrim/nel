/**
 * Copie google-apps-script/csv-templates/*.csv → public/csv/
 * (fichiers servis par Vite en secours HTTP quand Google Sheets est indisponible).
 */
import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "google-apps-script/csv-templates");
const destDir = join(root, "public/csv");

mkdirSync(destDir, { recursive: true });

const files = readdirSync(srcDir).filter((name) => name.endsWith(".csv"));
for (const name of files) {
  cpSync(join(srcDir, name), join(destDir, name));
}

console.log(`[sync-csv] ${files.length} fichier(s) → public/csv/`);
