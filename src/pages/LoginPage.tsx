import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import "./LoginPage.css";

export function LoginPage() {
  const { t } = useTranslation();
  const { login, signup, isLoading, error } = useAuthStore();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    try {
      if (isSignup) {
        await signup(email, password, displayName, age, bio, isPro);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setLocalError(error || "Une erreur est survenue");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">Nel</h1>
          <p className="login-subtitle">
            {isSignup ? "Créer un compte" : "Se connecter"}
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
              Email
            </label>
            <input
              id="email"
              type="email"
              className="login-input"
              placeholder="votre@email.com"
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
                  Nom d'affichage
                </label>
                <input
                  id="displayName"
                  type="text"
                  className="login-input"
                  placeholder="Votre nom"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="age" className="login-label">
                  Âge (optionnel)
                </label>
                <input
                  id="age"
                  type="number"
                  className="login-input"
                  placeholder="Votre âge"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  disabled={isLoading}
                  min="13"
                  max="120"
                />
              </div>

              <div className="login-field">
                <label htmlFor="bio" className="login-label">
                  Bio (optionnel)
                </label>
                <textarea
                  id="bio"
                  className="login-input"
                  placeholder="Dites-nous un peu sur vous..."
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
                  Compte professionnel
                </label>
              </div>
            </>
          )}

          <div className="login-field">
            <label htmlFor="password" className="login-label">
              Mot de passe
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

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (
              <span className="login-button-loading">
                <span className="spinner" />
                Chargement...
              </span>
            ) : isSignup ? (
              "Créer un compte"
            ) : (
              "Se connecter"
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-toggle-text">
            {isSignup ? "Déjà un compte ?" : "Pas de compte ?"}
          </p>
          <button
            type="button"
            className="login-toggle-button"
            onClick={() => {
              setIsSignup(!isSignup);
              setLocalError("");
              setEmail("");
              setPassword("");
              setDisplayName("");
              setAge("");
              setBio("");
              setIsPro(false);
            }}
            disabled={isLoading}
          >
            {isSignup ? "Se connecter" : "Créer un compte"}
          </button>
        </div>

        <div className="login-demo-hint">
          <p>Pour tester, utilisez:</p>
          <p>
            <strong>Email:</strong> demo@nel.com
          </p>
          <p>
            <strong>Mot de passe:</strong> password
          </p>
        </div>
      </div>
    </div>
  );
}
