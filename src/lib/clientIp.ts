/** Récupère l’adresse IP publique du client (best-effort). */
export async function fetchClientIp(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    if (!response.ok) return "";
    const data = (await response.json()) as { ip?: string };
    return data.ip?.trim() ?? "";
  } catch {
    return "";
  }
}
