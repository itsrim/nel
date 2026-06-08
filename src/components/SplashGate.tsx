import { useEffect, useState, type ReactNode } from "react";
import { SplashScreen } from "./SplashScreen";

const SPLASH_DURATION_MS = 2000;

interface SplashGateProps {
  children: ReactNode;
}

export function SplashGate({ children }: SplashGateProps) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      {children}
      {showSplash ? <SplashScreen /> : null}
    </>
  );
}
