import type { AdminReportEntry } from "../data/mockData";
import { ADMIN_USER_ID, isAdminAccount } from "./accountRoles";
import { fetchClientIp } from "./clientIp";
import {
  loadViewerSettingsRow,
  syncAdminSecurityAlertToSheets,
  syncViewerLoginIpToSheets,
} from "./appSheetPersistence";

export const SUSPICIOUS_LOGIN_MESSAGE =
  "Activité suspecte détectée : connexion depuis une adresse IP différente de celle utilisée à la création du compte. Votre accès a été bloqué. Contactez l’administrateur si besoin.";

export type LoginIpCheckResult =
  | { allowed: true; currentIp: string; isFirstLogin: boolean }
  | { allowed: false; message: string };

function buildSuspiciousLoginReport(input: {
  userId: string;
  email: string;
  displayName: string;
  signupIp: string;
  currentIp: string;
}): AdminReportEntry {
  const id = `rep_ip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    createdAt: Date.now(),
    kind: "suspicious_login",
    subjectId: input.userId,
    subjectLabel: input.displayName.trim() || input.email.trim() || input.userId,
    explanation:
      `Tentative de connexion bloquée pour ${input.email || input.userId}. ` +
      `IP à la création : ${input.signupIp}. IP actuelle : ${input.currentIp}.`,
    read: false,
  };
}

/** Vérifie l’IP à la connexion ; enregistre signupIp au premier accès. */
export async function enforceLoginIpSecurity(input: {
  userId: string;
  email: string;
  displayName: string;
  isAdmin?: boolean;
}): Promise<LoginIpCheckResult> {
  if (isAdminAccount({ id: input.userId, email: input.email, isAdmin: input.isAdmin })) {
    return { allowed: true, currentIp: "", isFirstLogin: false };
  }

  const currentIp = await fetchClientIp();
  const row = await loadViewerSettingsRow(input.userId);
  const signupIp = row?.signupIp?.trim() ?? "";

  if (!signupIp) {
    if (currentIp) {
      await syncViewerLoginIpToSheets(input.userId, {
        signupIp: currentIp,
        lastLoginIp: currentIp,
      });
    }
    return { allowed: true, currentIp, isFirstLogin: true };
  }

  if (!currentIp || currentIp === signupIp) {
    if (currentIp) {
      await syncViewerLoginIpToSheets(input.userId, {
        signupIp,
        lastLoginIp: currentIp,
      });
    }
    return { allowed: true, currentIp, isFirstLogin: false };
  }

  const report = buildSuspiciousLoginReport({
    userId: input.userId,
    email: input.email,
    displayName: input.displayName,
    signupIp,
    currentIp,
  });
  await syncAdminSecurityAlertToSheets(report);

  return { allowed: false, message: SUSPICIOUS_LOGIN_MESSAGE };
}
