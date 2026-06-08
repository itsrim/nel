import "./SplashScreen.css";

const SPLASH_IMAGE = `${import.meta.env.BASE_URL}event-cover-themes/TOULOUSE.jpg`;

export function SplashScreen() {
  return (
    <div className="splash-screen" role="img" aria-label="Happy Let's Go">
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
