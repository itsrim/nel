import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import { PublicLandingSections } from "../components/PublicLandingSections";
import "../components/PublicLandingSections.css";
import { matchFrontAdminLogin } from "../lib/frontAdminLogin";
import {
  canSubmitSignin,
  isValidEmailFormat,
  requiresSigninEmailFormat,
  showsSigninEmailFormatHint,
} from "../lib/loginFormValidation";
import {
  getSignupFormBlockers,
  type SignupBlockerId,
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
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<SignupBlockerId, string>>
  >({});
  const authSectionRef = useRef<HTMLDivElement>(null);

  const scrollToAuth = useCallback(() => {
    authSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const clearFieldError = useCallback((field: SignupBlockerId) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const signupFieldErrorMessage = useCallback(
    (field: SignupBlockerId): string => {
      switch (field) {
        case "displayName":
          return t("loginDisplayNameRequired");
        case "email":
          return t("loginEmailInvalid");
        case "age":
          return t("loginAgeInvalid");
        case "password":
          return t("loginPasswordTooShort");
        case "captcha":
          return t("loginCaptchaInvalid");
      }
    },
    [t],
  );

  const refreshCaptcha = useCallback(() => {
    setCaptcha(createMathCaptcha());
    setCaptchaAnswer("");
    clearFieldError("captcha");
  }, [clearFieldError]);

  const validateSignupFields = useCallback((): Partial<
    Record<SignupBlockerId, string>
  > => {
    const captchaValid = isMathCaptchaAnswerValid(captcha, captchaAnswer);
    const blockers = getSignupFormBlockers({
      email,
      password,
      displayName,
      age,
      captchaValid,
    });
    const errors: Partial<Record<SignupBlockerId, string>> = {};
    blockers.forEach((field) => {
      errors[field] = signupFieldErrorMessage(field);
    });
    return errors;
  }, [
    email,
    password,
    displayName,
    age,
    captcha,
    captchaAnswer,
    signupFieldErrorMessage,
  ]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setFieldErrors({});

    if (view === "forgot") {
      if (!isValidEmailFormat(email)) {
        setLocalError(t("loginEmailInvalid"));
        return;
      }
      await requestPasswordReset(email);
      return;
    }

    if (view === "reset") {
      if (!resetToken) {
        setLocalError(t("loginGenericError"));
        return;
      }
      if (newPassword.length < 6 || confirmPassword.length < 6) {
        setLocalError(t("loginPasswordTooShort"));
        return;
      }
      if (newPassword !== confirmPassword) {
        setLocalError(t("loginResetMismatch"));
        return;
      }
      await resetPassword(resetToken, newPassword);
      return;
    }

    if (view === "signup") {
      const errors = validateSignupFields();
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        if (errors.captcha) refreshCaptcha();
        return;
      }
    }

    if (view === "signin") {
      const adminLogin = matchFrontAdminLogin(email, password);
      if (!adminLogin) {
        if (!canSubmitSignin(email, password)) {
          if (!email.trim()) {
            setLocalError(t("loginEmailInvalid"));
            return;
          }
          if (password.length < 6) {
            setLocalError(t("loginPasswordTooShort"));
            return;
          }
        }
        if (requiresSigninEmailFormat(email, password) && !isValidEmailFormat(email)) {
          setLocalError(t("loginEmailInvalid"));
          return;
        }
      }
      if (!isMathCaptchaAnswerValid(captcha, captchaAnswer)) {
        setLocalError(t("loginCaptchaInvalid"));
        refreshCaptcha();
        return;
      }
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
    <div className="login-page public-site">
      <header className="public-site-header">
        <div className="public-site-header-inner">
        <a href="#accueil" className="public-site-logo">
          Happy Let&apos;s Go
        </a>
        <nav className="public-site-nav" aria-label="Navigation principale">
          <a href="#accueil">{t("landingNavHome")}</a>
          <a href="#decouvrir">{t("landingNavDiscover")}</a>
          <a href="#comment">{t("landingNavHow")}</a>
          <a href="#professionnels">{t("landingNavPros")}</a>
          <button type="button" className="public-site-nav-cta" onClick={scrollToAuth}>
            {t("landingNavJoin")}
          </button>
        </nav>
        </div>
      </header>

      <main className="public-site-main">
        <section className="public-hero" id="accueil">
          <div className="public-hero-copy">
            <p className="public-hero-badge">{t("landingHeroBadge")}</p>
            <h1 className="public-hero-title">{t("landingHeroTitle")}</h1>
            <p className="public-hero-lead">{t("landingHeroLead")}</p>
            <p className="public-hero-sub">{t("landingHeroSub")}</p>
            <div className="public-hero-actions">
              <button type="button" className="landing-cta-btn" onClick={scrollToAuth}>
                {t("landingCtaJoin")}
              </button>
              <a href="#decouvrir" className="public-hero-link">
                {t("landingCtaDiscover")}
              </a>
            </div>
          </div>

          <div className="login-container" id="connexion" ref={authSectionRef}>
          <div className="login-header">
            <h1 className="login-title">{t("loginTitle")}</h1>
            <p className="login-subtitle">{subtitle}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
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
                  {view === "signin" ? t("loginEmailOrId") : t("loginEmail")}
                </label>
                <input
                  id="email"
                  type="text"
                  inputMode={view === "signin" ? "text" : "email"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`login-input${fieldErrors.email ? " login-input--error" : ""}`}
                  placeholder={t("loginPlaceholderEmail")}
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  disabled={isLoading}
                  required
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={
                    fieldErrors.email
                      ? "login-email-error"
                      : view === "signin" && showsSigninEmailFormatHint(email)
                        ? "login-email-format-hint"
                        : undefined
                  }
                />
                {fieldErrors.email ? (
                  <p id="login-email-error" className="login-field-hint login-field-hint--error" role="alert">
                    {fieldErrors.email}
                  </p>
                ) : null}
                {view === "signin" && !fieldErrors.email && showsSigninEmailFormatHint(email) ? (
                  <p id="login-email-format-hint" className="login-field-hint">
                    {t("loginEmailFormatHint")}
                  </p>
                ) : null}
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
                    className={`login-input${fieldErrors.displayName ? " login-input--error" : ""}`}
                    placeholder={t("loginPlaceholderDisplayName")}
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      clearFieldError("displayName");
                    }}
                    disabled={isLoading}
                    required
                    aria-invalid={!!fieldErrors.displayName}
                    aria-describedby={fieldErrors.displayName ? "login-displayName-error" : undefined}
                  />
                  {fieldErrors.displayName ? (
                    <p id="login-displayName-error" className="login-field-hint login-field-hint--error" role="alert">
                      {fieldErrors.displayName}
                    </p>
                  ) : null}
                </div>

                <div className="login-field">
                  <label htmlFor="age" className="login-label">
                    {t("loginAge")}
                  </label>
                  <input
                    id="age"
                    type="number"
                    className={`login-input${fieldErrors.age ? " login-input--error" : ""}`}
                    placeholder={t("loginPlaceholderAge")}
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);
                      clearFieldError("age");
                    }}
                    disabled={isLoading}
                    min={MIN_SIGNUP_AGE}
                    max={MAX_SIGNUP_AGE}
                    required
                    aria-invalid={!!fieldErrors.age}
                    aria-describedby={fieldErrors.age ? "login-age-error" : "login-age-hint"}
                  />
                  {fieldErrors.age ? (
                    <p id="login-age-error" className="login-field-hint login-field-hint--error" role="alert">
                      {fieldErrors.age}
                    </p>
                  ) : (
                    <p id="login-age-hint" className="login-field-hint">
                      {t("loginAgeHint")}
                    </p>
                  )}
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
                  className={`login-input${fieldErrors.password ? " login-input--error" : ""}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  disabled={isLoading}
                  required
                  minLength={6}
                  autoComplete={view === "signup" ? "new-password" : "current-password"}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                />
                {fieldErrors.password ? (
                  <p id="login-password-error" className="login-field-hint login-field-hint--error" role="alert">
                    {fieldErrors.password}
                  </p>
                ) : null}
                {view === "signup" && !fieldErrors.password ? (
                  <p className="login-field-hint">{t("loginResetHint")}</p>
                ) : null}
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

            {(view === "signin" || view === "signup") ? (
              <div className="login-field">
                <label htmlFor="captcha" className="login-label">
                  {t("loginCaptchaLabel")} : {captcha.question}
                </label>
                <input
                  id="captcha"
                  type="text"
                  inputMode="numeric"
                  className={`login-input${fieldErrors.captcha ? " login-input--error" : ""}`}
                  placeholder={t("loginCaptchaPlaceholder")}
                  value={captchaAnswer}
                  onChange={(e) => {
                    setCaptchaAnswer(e.target.value.replace(/[^\d-]/g, ""));
                    clearFieldError("captcha");
                  }}
                  disabled={isLoading}
                  required
                  autoComplete="off"
                  aria-invalid={!!fieldErrors.captcha}
                  aria-describedby={fieldErrors.captcha ? "login-captcha-error" : undefined}
                />
                {fieldErrors.captcha ? (
                  <p id="login-captcha-error" className="login-field-hint login-field-hint--error" role="alert">
                    {fieldErrors.captcha}
                  </p>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
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
                    setFieldErrors({});
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
        </section>

        <PublicLandingSections onScrollToAuth={scrollToAuth} />
      </main>
    </div>
  );
}
