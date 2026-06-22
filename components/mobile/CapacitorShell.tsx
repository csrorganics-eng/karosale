"use client";

import { useEffect } from "react";

/**
 * Runs only inside Capacitor WebViews: status bar tint, safe-area friendly chrome.
 * No-op in the browser / Vercel deployment.
 */
export function CapacitorShell() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (cancelled || !Capacitor.isNativePlatform()) return;

      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#15803d" });
      } catch {
        /* Plugins missing in web-only builds — ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
