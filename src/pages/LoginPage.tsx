import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import {
  isValidSignupAge,
  MAX_SIGNUP_AGE,
  MIN_SIGNUP_AGE,
} from "../lib/signupValidation";
import {
  createMathCaptcha,
  isMathCaptchaAnswerValid,
  type MathCaptcha,
} from "../lib/signupCaptcha";
import "./LoginPage.css";

function readVerifyTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("verifyEmail")?.trim();
  if (!token) return null;
  const url = new URL(window.location.href);
  url.searchParams.delete("verifyEmail");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  return token;
}

function readResetTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("resetPassword")?.trim();
  if (!token) return null;
  const url = new URL(window.location.href);
  url.searchParams.delete("resetPassword");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  return token;
}

type LoginView = "signin" | "signup" | "forgot" | "reset";

export function LoginPage() {
  const { t } = useTranslation();
  const {
    login,
    signup,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword,
    clearPendingVerification,
    clearPasswordResetMessage,
    isLoading,
    error,
    pendingVerificationEmail,
    verificationMessage,
    passwordResetMessage,
  } = useAuthStore();

  const [view, setView] = useState<LoginView>("signin");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [localError, setLocalError] = useState("");
  const [verifyingLink, setVerifyingLink] = useState(false);
  const [captcha, setCaptcha] = useState<MathCaptcha>(() => createMathCaptcha());
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const refreshCaptcha = useCallback(() => {
    setCaptcha(createMathCaptcha());
    setCaptchaAnswer("");
  }, []);

  useEffect(() => {
    const token = readVerifyTokenFromUrl();
    if (!token) return;
    setVerifyingLink(true);
    void verifyEmail(token).finally(() => setVerifyingLink(false));
  }, [verifyEmail]);

  useEffect(() => {
    const token = readResetTokenFromUrl();
    if (!token) return;
    setResetToken(token);
    setView("reset");
    clearPasswordResetMessage();
  }, [clearPasswordResetMessage]);

  const signupFormValid = useMemo(() => {
    if (view !== "signup") return true;
    if (!email.trim() || !password || !displayName.trim()) return false;
    if (!isValidSignupAge(age)) return false;
    return isMathCaptchaAnswerValid(captcha, captchaAnswer);
  }, [view, email, password, displayName, age, captcha, captchaAnswer]);

  const resetFormValid = useMemo(() => {
    return (
      newPassword.length >= 6 &&
      confirmPassword.length >= 6 &&
      newPassword === confirmPassword
    );
  }, [newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (view === "forgot") {
      await requestPasswordReset(email);
      return;
    }

    if (view === "reset") {
      if (!resetToken) {
        setLocalError(t("loginGenericError"));
        return;
      }
      if (newPassword !== confirmPassword) {
        setLocalError(t("loginResetMismatch"));
        return;
      }
      await resetPassword(resetToken, newPassword);
      return;
    }

    if (view === "signup" && !isValidSignupAge(age)) {
      setLocalError(t("loginAgeInvalid"));
      return;
    }

    if (view === "signup" && !isMathCaptchaAnswerValid(captcha, captchaAnswer)) {
      setLocalError(t("loginCaptchaInvalid"));
      refreshCaptcha();
      return;
    }

    try {
      if (view === "signup") {
        await signup(email, password, displayName, age, bio, isPro);
      } else {
        await login(email, password);
      }
    } catch {
      setLocalError(error || t("loginGenericError"));
    }
  };

  if (verifyingLink) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <h1 className="login-title">{t("loginTitle")}</h1>
            <p className="login-subtitle">{t("loginVerifyInProgress")}</p>
          </div>
          <p className="login-pending-text">
            <span className="spinner" aria-hidden /> {t("loginPleaseWait")}
          </p>
        </div>
      </div>
    );
  }

  if (pendingVerificationEmail) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <h1 className="login-title">{t("loginTitle")}</h1>
            <p className="login-subtitle">{t("loginVerifyTitle")}</p>
          </div>

          {(verificationMessage || error) ? (
            <div
              className={
                error ||
                (verificationMessage &&
                  !verificationMessage.startsWith("Compte créé") &&
                  !verificationMessage.includes("a été envoyé") &&
                  !/renvoyé/i.test(verificationMessage))
                  ? "login-error"
                  : "login-success"
              }
              role="alert"
            >
              {error || verificationMessage}
            </div>
          ) : null}

          <p className="login-pending-text">
            {t("loginVerifySentPrefix")}{" "}
            <strong>{pendingVerificationEmail}</strong>. {t("loginVerifySentSuffix")}
          </p>

          <div className="login-pending-actions">
            <button
              type="button"
              className="login-button login-button--secondary"
              disabled={isLoading}
              onClick={() => void resendVerification()}
            >
              {isLoading ? t("loginResending") : t("loginResendEmail")}
            </button>
          </div>

          <div className="login-footer">
            <button
              type="button"
              className="login-toggle-button"
              onClick={() => {
                clearPendingVerification();
                setView("signin");
              }}
              disabled={isLoading}
            >
              {t("loginBackToSignIn")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const subtitle =
    view === "signup"
      ? t("loginSignUp")
      : view === "forgot"
        ? t("loginForgotTitle")
        : view === "reset"
          ? t("loginResetTitle")
          : t("loginSignIn");

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">{t("loginTitle")}</h1>
          <p className="login-subtitle">{subtitle}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {(error || localError) && (
            <div className="login-error" role="alert">
              {error || localError}
            </div>
          )}

          {passwordResetMessage ? (
            <div
              className={
                passwordResetMessage.includes("n'a pas pu") ||
                passwordResetMessage.includes("not been sent")
                  ? "login-error"
                  : "login-success"
              }
              role="status"
            >
              {passwordResetMessage}
            </div>
          ) : null}

          {view === "forgot" ? (
            <p className="login-field-hint login-forgot-hint">{t("loginForgotHint")}</p>
          ) : null}

          {view === "reset" ? (
            <p className="login-field-hint login-forgot-hint">{t("loginResetHint")}</p>
          ) : null}

          {(view === "signin" || view === "signup" || view === "forgot") && (
            <div className="login-field">
              <label htmlFor="email" className="login-label">
                {view === "signup" || view === "forgot" ? t("loginEmail") : t("loginEmailOrId")}
              </label>
              <input
                id="email"
                type={view === "signup" || view === "forgot" ? "email" : "text"}
                className="login-input"
                placeholder={
                  view === "signup" || view === "forgot"
                    ? t("loginPlaceholderEmail")
                    : t("loginPlaceholderId")
                }
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          )}

          {view === "signup" && (
            <>
              <div className="login-field">
                <label htmlFor="displayName" className="login-label">
                  {t("loginDisplayName")}
                </label>
                <input
                  id="displayName"
                  type="text"
                  className="login-input"
                  placeholder={t("loginPlaceholderDisplayName")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="age" className="login-label">
                  {t("loginAge")}
                </label>
                <input
                  id="age"
                  type="number"
                  className="login-input"
                  placeholder={t("loginPlaceholderAge")}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  disabled={isLoading}
                  min={MIN_SIGNUP_AGE}
                  max={MAX_SIGNUP_AGE}
                  required
                  aria-describedby="login-age-hint"
                />
                <p id="login-age-hint" className="login-field-hint">
                  {t("loginAgeHint")}
                </p>
              </div>

              <div className="login-field">
                <label htmlFor="bio" className="login-label">
                  {t("loginBioOptional")}
                </label>
                <textarea
                  id="bio"
                  className="login-input"
                  placeholder={t("loginPlaceholderBio")}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <div className="login-field login-field--checkbox">
                <input
                  id="isPro"
                  type="checkbox"
                  className="login-checkbox"
                  checked={isPro}
                  onChange={(e) => setIsPro(e.target.checked)}
                  disabled={isLoading}
                />
                <label htmlFor="isPro" className="login-label login-label--checkbox">
                  {t("loginProAccount")}
                </label>
              </div>
              {isPro ? (
                <p className="login-pro-hint">{t("loginProCompleteInProfile")}</p>
              ) : null}
            </>
          )}

          {view === "reset" && (
            <>
              <div className="login-field">
                <label htmlFor="newPassword" className="login-label">
                  {t("loginResetPassword")}
                </label>
                <input
                  id="newPassword"
                  type="password"
                  className="login-input"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="login-field">
                <label htmlFor="confirmPassword" className="login-label">
                  {t("loginResetConfirm")}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="login-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {(view === "signin" || view === "signup") && (
            <div className="login-field">
              <label htmlFor="password" className="login-label">
                {t("loginPassword")}
              </label>
              <input
                id="password"
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              {view === "signin" ? (
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={() => {
                    setLocalError("");
                    clearPasswordResetMessage();
                    setView("forgot");
                  }}
                  disabled={isLoading}
                >
                  {t("loginForgotPassword")}
                </button>
              ) : null}
            </div>
          )}

          {view === "signup" ? (
            <div className="login-field">
              <label htmlFor="captcha" className="login-label">
                {t("loginCaptchaLabel")} : {captcha.question}
              </label>
              <input
                id="captcha"
                type="number"
                inputMode="numeric"
                className="login-input"
                placeholder={t("loginCaptchaPlaceholder")}
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="off"
              />
            </div>
          ) : null}

          <button
            type="submit"
            className="login-button"
            disabled={
              isLoading ||
              (view === "signup" && !signupFormValid) ||
              (view === "reset" && !resetFormValid)
            }
          >
            {isLoading ? (
              <span className="login-button-loading">
                <span className="spinner" />
                {t("loginLoading")}
              </span>
            ) : view === "signup" ? (
              t("loginSignUp")
            ) : view === "forgot" ? (
              t("loginForgotSubmit")
            ) : view === "reset" ? (
              t("loginResetSubmit")
            ) : (
              t("loginSignIn")
            )}
          </button>
        </form>

        <div className="login-footer">
          {view === "forgot" || view === "reset" ? (
            <button
              type="button"
              className="login-toggle-button"
              onClick={() => {
                setView("signin");
                setLocalError("");
                clearPasswordResetMessage();
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={isLoading}
            >
              {t("loginForgotBack")}
            </button>
          ) : (
            <>
              <p className="login-toggle-text">
                {view === "signup" ? t("loginHasAccount") : t("loginNoAccount")}
              </p>
              <button
                type="button"
                className="login-toggle-button"
                onClick={() => {
                  const nextSignup = view !== "signup";
                  setView(nextSignup ? "signup" : "signin");
                  setLocalError("");
                  clearPendingVerification();
                  clearPasswordResetMessage();
                  setEmail("");
                  setPassword("");
                  setDisplayName("");
                  setAge("");
                  setBio("");
                  setIsPro(false);
                  refreshCaptcha();
                }}
                disabled={isLoading}
              >
                {view === "signup" ? t("loginSignIn") : t("loginSignUp")}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
