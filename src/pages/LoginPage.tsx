import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import {
  isValidSignupAge,
  MAX_SIGNUP_AGE,
  MIN_SIGNUP_AGE,
} from "../lib/signupValidation";
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

export function LoginPage() {
  const { t } = useTranslation();
  const {
    login,
    signup,
    verifyEmail,
    resendVerification,
    clearPendingVerification,
    isLoading,
    error,
    pendingVerificationEmail,
    verificationMessage,
  } = useAuthStore();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [localError, setLocalError] = useState("");
  const [verifyingLink, setVerifyingLink] = useState(false);

  useEffect(() => {
    const token = readVerifyTokenFromUrl();
    if (!token) return;
    setVerifyingLink(true);
    void verifyEmail(token).finally(() => setVerifyingLink(false));
  }, [verifyEmail]);

  const signupFormValid = useMemo(() => {
    if (!isSignup) return true;
    if (!email.trim() || !password || !displayName.trim()) return false;
    return isValidSignupAge(age);
  }, [isSignup, email, password, displayName, age]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (isSignup && !isValidSignupAge(age)) {
      setLocalError(t("loginAgeInvalid"));
      return;
    }

    try {
      if (isSignup) {
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

          {verificationMessage ? (
            <div className="login-success" role="status">
              {verificationMessage}
            </div>
          ) : null}
          {error ? (
            <div className="login-error" role="alert">
              {error}
            </div>
          ) : null}

          <p className="login-pending-text">
            {t("loginVerifySentPrefix")}{" "}
            <strong>{pendingVerificationEmail}</strong>. {t("loginVerifySentSuffix")}
          </p>

          <button
            type="button"
            className="login-button login-button--secondary"
            disabled={isLoading}
            onClick={() => void resendVerification()}
          >
            {isLoading ? t("loginResending") : t("loginResendEmail")}
          </button>

          <div className="login-footer">
            <button
              type="button"
              className="login-toggle-button"
              onClick={() => {
                clearPendingVerification();
                setIsSignup(false);
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

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">{t("loginTitle")}</h1>
          <p className="login-subtitle">
            {isSignup ? t("loginSignUp") : t("loginSignIn")}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {(error || localError) && (
            <div className="login-error" role="alert">
              {error || localError}
            </div>
          )}

          <div className="login-field">
            <label htmlFor="email" className="login-label">
              {isSignup ? t("loginEmail") : t("loginEmailOrId")}
            </label>
            <input
              id="email"
              type={isSignup ? "email" : "text"}
              className="login-input"
              placeholder={
                isSignup ? t("loginPlaceholderEmail") : t("loginPlaceholderId")
              }
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {isSignup && (
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
            </>
          )}

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
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || (isSignup && !signupFormValid)}
          >
            {isLoading ? (
              <span className="login-button-loading">
                <span className="spinner" />
                {t("loginLoading")}
              </span>
            ) : isSignup ? (
              t("loginSignUp")
            ) : (
              t("loginSignIn")
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-toggle-text">
            {isSignup ? t("loginHasAccount") : t("loginNoAccount")}
          </p>
          <button
            type="button"
            className="login-toggle-button"
            onClick={() => {
              const nextSignup = !isSignup;
              setIsSignup(nextSignup);
              setLocalError("");
              clearPendingVerification();
              setEmail("");
              setPassword("");
              setDisplayName("");
              setAge("");
              setBio("");
              setIsPro(false);
            }}
            disabled={isLoading}
          >
            {isSignup ? t("loginSignIn") : t("loginSignUp")}
          </button>
        </div>

      </div>
    </div>
  );
}
