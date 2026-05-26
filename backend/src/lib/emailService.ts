import { appPublicUrl, emailFrom, isEmailConfigured, resendApiKey } from "./emailConfig.js";

export async function sendVerificationEmail(
  to: string,
  displayName: string,
  token: string,
): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn("[email] RESEND_API_KEY absent — email de vérification non envoyé");
    console.warn(`[email] Lien de vérification (dev): ${buildVerificationUrl(token)}`);
    return;
  }

  const verifyUrl = buildVerificationUrl(token);
  const name = displayName.trim() || "there";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom(),
      to: [to],
      subject: "Confirmez votre adresse email — Nel",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
          <h1 style="font-size: 22px; margin-bottom: 8px;">Bienvenue sur Nel, ${escapeHtml(name)} !</h1>
          <p style="line-height: 1.5; color: #444;">
            Merci de créer un compte. Cliquez sur le bouton ci-dessous pour confirmer votre adresse email.
            Ce lien expire dans 24&nbsp;heures.
          </p>
          <p style="margin: 28px 0;">
            <a href="${verifyUrl}" style="background: #fbbf24; color: #111; font-weight: 700; padding: 12px 24px; border-radius: 999px; text-decoration: none; display: inline-block;">
              Vérifier mon email
            </a>
          </p>
          <p style="font-size: 13px; color: #888; word-break: break-all;">
            Ou copiez ce lien :<br />${verifyUrl}
          </p>
          <p style="font-size: 12px; color: #aaa; margin-top: 32px;">
            Si vous n'avez pas créé de compte Nel, ignorez cet email.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Envoi email échoué (${res.status}): ${body.slice(0, 200)}`);
  }
}

export function buildVerificationUrl(token: string): string {
  const base = appPublicUrl();
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}verifyEmail=${encodeURIComponent(token)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
