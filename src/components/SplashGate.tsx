import { useEffect, useState, type ReactNode } from "react";
import { readAdminAppInfo } from "../lib/adminAppInfo";
import { useMessagingStore } from "../store/useMessagingStore";
import { AnnouncementModal } from "./AnnouncementModal";
import { SplashScreen } from "./SplashScreen";

const SPLASH_DURATION_MS = 2000;

interface SplashGateProps {
  children: ReactNode;
}

export function SplashGate({ children }: SplashGateProps) {
  const splashEnabled = useMessagingStore((s) => s.adminAppInfo.splashScreenEnabled);
  const initialSplashEnabled = readAdminAppInfo().splashScreenEnabled;
  const [showSplash, setShowSplash] = useState(initialSplashEnabled);
  const [splashDone, setSplashDone] = useState(!initialSplashEnabled);

  useEffect(() => {
    if (!splashEnabled) {
      setShowSplash(false);
      setSplashDone(true);
      return;
    }
    setShowSplash(true);
    setSplashDone(false);
    const timer = window.setTimeout(() => {
      setShowSplash(false);
      setSplashDone(true);
    }, SPLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [splashEnabled]);

  return (
    <>
      {children}
      {showSplash && splashEnabled ? <SplashScreen /> : null}
      <AnnouncementModal ready={splashDone} />
    </>
  );
}
