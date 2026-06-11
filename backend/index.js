/**
 * Point d’entrée HidenCloud — définir MAIN_FILE=index.js dans le panneau.
 * Variables : fichier .env à la racine (/home/container/.env).
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const serverPath = join(dirname(fileURLToPath(import.meta.url)), "dist", "server.js");

if (!existsSync(serverPath)) {
  console.error(
    "[nel-api] dist/server.js introuvable. Exécutez « npm run build » puis redémarrez.",
  );
  process.exit(1);
}

await import("./dist/server.js");
