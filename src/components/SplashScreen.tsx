import { useMessagingStore } from "../store/useMessagingStore";
import { resolveSplashImageUrl } from "../lib/adminAppInfo";
import "./SplashScreen.css";

export function SplashScreen() {
  const splashImageUrl = useMessagingStore((s) => s.adminAppInfo.splashImageUrl);
  const imageSrc = resolveSplashImageUrl(splashImageUrl);

  return (
    <div className="splash-screen" aria-label="Happy, let's GO">
      <h1 className="splash-screen-title">Happy, let&apos;s GO</h1>
      <img
        src={imageSrc}
        alt=""
        className="splash-screen-img"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
