import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shells (iOS / Android) load your deployed Next.js app in a WebView.
 * `webDir` must exist for `cap sync`; live content comes from `server.url`.
 *
 * Override the URL when syncing / opening native projects:
 *   CAPACITOR_SERVER_URL=https://staging.example.com npm run mobile:sync
 */
const serverUrl = (
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "https://karosale.com"
).replace(/\/$/, "");

const config: CapacitorConfig = {
  appId: "com.csrorganics.store",
  appName: "CSR Organics",
  webDir: "capacitor-www",
  server: {
    url: serverUrl,
    /** Set CAPACITOR_ALLOW_CLEARTEXT=true only for LAN dev (http://192.168.x.x). */
    cleartext: process.env.CAPACITOR_ALLOW_CLEARTEXT === "true",
  },
  android: {
    /** Match https pages for cookie / storage behaviour closer to Safari / Chrome. */
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 400,
      launchAutoHide: true,
      backgroundColor: "#15803d",
      showSpinner: false,
    },
  },
};

export default config;
