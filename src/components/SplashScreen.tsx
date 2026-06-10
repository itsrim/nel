import "./SplashScreen.css";

const SPLASH_IMAGE = `${import.meta.env.BASE_URL}event-cover-themes/TOULOUSE.jpg`;

export function SplashScreen() {
  return (
    <div className="splash-screen" aria-label="Happy, let's GO">
      <h1 className="splash-screen-title">Happy, let&apos;s GO</h1>
      <img
        src={SPLASH_IMAGE}
        alt=""
        className="splash-screen-img"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
